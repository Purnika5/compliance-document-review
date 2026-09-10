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
