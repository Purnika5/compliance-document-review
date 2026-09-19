# Data Engineering — Research & Decisions Log

## Week 2: Text Extraction + Masking Pipeline

### 1. PDF Library Choice: pdfplumber vs PyPDF2

**Options considered:**
- PyPDF2 — simple, widely used, but struggles with complex layouts and does
  not reliably extract tables
- pdfplumber — actively maintained, preserves table structure, exposes
  `extract_tables()` per page

**Decision:** pdfplumber. Compliance documents (disclosure forms) frequently
contain tables (e.g. amounts, dates, checkboxes laid out in a grid). pdfplumber's
table extraction is meaningfully more reliable than PyPDF2's plain-text-only
approach, and the roadmap's "Absence Detection" (Week 3) depends on being able
to tell whether a required field/table was actually present in the document.

---

### 2. DOCX / XLSX Libraries

**Options considered:**
- `python-docx` for DOCX — the standard library for this, no real alternative
  with comparable API maturity
- `openpyxl` for XLSX — same situation; handles both reading and (if ever
  needed) writing xlsx files

**Decision:** Used both as-is; no meaningful alternative was evaluated since
these are the de facto standard libraries for their formats in Python.

---

### 3. Normalizing Three File Types Into One Return Shape

**Options considered:**
- Return a different object per file type (PDF result, DOCX result, XLSX result)
- Return one common `ExtractedDocument` dataclass regardless of source format

**Decision:** One common `ExtractedDocument` shape (`file_type`, `raw_text`,
`page_or_sheet_count`, `tables`). Downstream consumers (masking, vector store
in Week 3) shouldn't need to know or care whether a document originally came
from a PDF, DOCX, or XLSX — they just need clean text and, where available,
structured tables.

---

### 4. Masking Integration: Blocking vs. Interface Now

**Options considered:**
- Wait for DevOps's PII Masking Engine to be built before writing any
  pipeline code that touches masking
- Define the masking interface now (`MaskingService` protocol) with a
  no-op `PassthroughMaskingService` placeholder, so extraction + wiring can
  be built, tested, and reviewed today

**Decision:** Build the interface now. Per the roadmap's cross-team
dependency table, DevOps's masking engine blocks this task — but there's no
reason the extraction logic and pipeline wiring need to wait. `run_pipeline()`
takes a `masking_service` as a parameter (dependency injection), so swapping
`PassthroughMaskingService` for DevOps's real implementation later is a
one-line change at the call site, not a rewrite. The `PassthroughMaskingService`
docstring explicitly flags that it must not be used with real document data
in production, to avoid this being mistaken for "masking is done."

---

### 5. Why Tables Are Returned Separately From `raw_text`

**Options considered:**
- Flatten tables into `raw_text` only
- Keep `tables` as a separate structured field alongside `raw_text`

**Decision:** Keep both. `raw_text` is what the AI/RAG pipeline (Week 3) will
mostly work with for semantic search. `tables` is kept structured (list of
rows) separately because "Absence Detection" and precedent analysis may need
to check for the *presence* of specific tabular fields, which is harder to
detect reliably once flattened into plain prose text.

---

## Week 2 (addendum): Graceful Corrupted & Encrypted File Exception Handling

**Context:** Uploading a corrupted PDF, password-encrypted file, or malformed
spreadsheet previously threw unhandled exceptions (`PdfReadError`,
`BadZipFile`) that could crash the worker process.

**What changed in `text_extraction.py`:**
- Added `FileProcessingError`, a subclass of the existing `TextExtractionError`
  — so any code already catching `TextExtractionError` (e.g. `pipeline.py`)
  continues to work unchanged, with no signature or return-shape changes to
  `extract_text()`, `ExtractedDocument`, or any existing function.
- `extract_pdf()`: pre-checks encryption via `pypdf` (catches `PdfReadError`,
  `FileNotDecryptedError`) before parsing; the `pdfplumber` extraction call is
  also wrapped, so a malformed/truncated PDF is caught instead of crashing.
- `extract_docx()`: wraps `python-docx`'s file open, catching
  `zipfile.BadZipFile` (not a zip at all) and `PackageNotFoundError` (valid
  zip, invalid docx package).
- `extract_xlsx()`: wraps `openpyxl`'s `load_workbook()`, catching
  `zipfile.BadZipFile`, `InvalidFileException`, and the plain `ValueError`
  openpyxl raises for password-encrypted workbooks.
- `FileProcessingError.to_response()` returns
  `{"error": "File corrupted or password-protected"}`, and `.status_code`
  is `400` — for the API layer to catch and return as an HTTP 400 instead
  of letting it propagate into a 500.

**Tests:** `tests/test_exception_handling.py` builds real corrupted/encrypted
PDF, DOCX, and XLSX byte strings in-memory (same `file_type, file_bytes` API
as the existing tests) and asserts each one raises `FileProcessingError` with
`status_code == 400`. All 8 tests (5 new + 3 original) pass.

**Acceptance criteria — status:**
| # | Criterion | Status |
|---|---|---|
| 1 | Wrap `pdfplumber`, `python-docx`, `openpyxl` calls in try/except | ✅ |
| 2 | Catch `PdfReadError`, `BadZipFile`, encryption exceptions | ✅ |
| 3 | Return `{"error": "File corrupted or password-protected"}` with HTTP 400 instead of a 500 crash | ✅ |
