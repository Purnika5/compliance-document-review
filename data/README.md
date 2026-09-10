# Data Engineering — Week 2 (The Silver Layer)

## Deliverables

### 1. Text Extraction (`text_extraction.py`)
- `extract_text(file_type, file_bytes)` — single entry point that dispatches
  to the right parser (PDF/DOCX/XLSX) and returns a normalized
  `ExtractedDocument` (`file_type`, `raw_text`, `page_or_sheet_count`, `tables`)
- PDF: `pdfplumber` (chosen for reliable table extraction — see research.md)
- DOCX: `python-docx`
- XLSX: `openpyxl`

### 2. Data Pipeline (`pipeline.py`)
- `run_pipeline(file_type, file_bytes, masking_service)` — chains extraction
  into masking, returning a `PipelineResult` ready for storage
- Masking is injected via a `MaskingService` protocol (interface), with a
  `PassthroughMaskingService` placeholder standing in until **DevOps's PII
  Masking Engine is ready** (this is a cross-team dependency per the
  roadmap — see research.md, section 4)

## ⚠️ Important: Masking Status
`PassthroughMaskingService` does **not** mask anything — it's a placeholder
so the pipeline wiring could be built and tested without blocking on DevOps.
**Do not use this in production or with real document data** until DevOps's
real masking engine is swapped in via the `masking_service` parameter.

## How to Run
```bash
pip install pdfplumber python-docx openpyxl
python text_extraction.py   # runs a self-contained extraction test
python pipeline.py          # runs extraction + (placeholder) masking end-to-end
```

## Dependencies
```
pdfplumber
python-docx
openpyxl
```

## Notes for the Team
- Once DevOps's masking engine exists, swap it in at the call site:
  `run_pipeline(file_type, file_bytes, masking_service=RealMaskingService())`
  — no changes needed inside `pipeline.py` itself.
- `tables` is kept structured (not flattened into `raw_text`) so Week 3's
  Absence Detection can check for specific missing fields more reliably.
- Next up (Week 3): vector store setup (pgvector/Qdrant) and RAG retrieval,
  which will consume `PipelineResult.masked_text`.


### Scanned PDF OCR fallback
Multi-page PDFs with fewer than 50 characters extracted by `pdfplumber` are
treated as likely scanned/image-based documents and routed through Tesseract
OCR via `pytesseract` and `pdf2image`.

Python dependencies are listed in `requirements.txt`. Tesseract itself is an
external system dependency and must be installed/configured on the machine
running the pipeline.
