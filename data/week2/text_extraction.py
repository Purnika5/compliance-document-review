"""
text_extraction.py
-------------------
Week 2 — Data Engineering: Text extraction for PDF, DOCX, and XLSX files.

Responsibilities:
  - Take a file (by path or bytes) already validated/stored by ingestion.py
    (Week 1), and extract clean, plain text from it.
  - Handle the three supported types robustly, including tables (compliance
    documents like disclosure forms often contain tabular data).
  - Return a single normalized `ExtractedDocument` regardless of source
    format, so downstream steps (masking, vector store) don't need to know
    the original file type.

This module does NOT do masking — that's DevOps's PII Masking Engine
(Week 2 dependency, see roadmap). See `pipeline.py` for how the two connect.
"""

import io
from dataclasses import dataclass, field

import pdfplumber
import pytesseract
from pdf2image import convert_from_bytes
from docx import Document as DocxDocument
from openpyxl import load_workbook


class TextExtractionError(Exception):
    """Raised when a file can't be parsed into text."""
    pass


@dataclass
class ExtractedDocument:
    file_type: str          # 'pdf' | 'docx' | 'xlsx'
    raw_text: str            # all extracted text, newline-joined
    page_or_sheet_count: int
    tables: list = field(default_factory=list)  # list of tables, each a list of rows


def extract_pdf(file_bytes: bytes) -> ExtractedDocument:
    """Extract text/tables with pdfplumber and fall back to OCR for scanned PDFs.

    A multi-page PDF is treated as scanned/image-based when pdfplumber extracts
    fewer than 50 characters. OCR is then run over rendered PDF pages using
    Tesseract. Tables extracted by pdfplumber are preserved separately.
    """
    text_parts = []
    tables = []

    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            page_count = len(pdf.pages)

            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)

                for table in page.extract_tables():
                    tables.append(table)
    except Exception as exc:
        raise TextExtractionError(f"Could not parse PDF: {exc}") from exc

    raw_text = "\n\n".join(text_parts).strip()

    # Acceptance criterion: only trigger the scanned-PDF fallback for
    # multi-page PDFs with fewer than 50 extracted characters.
    if len(raw_text) < 50:
        try:
            images = convert_from_bytes(file_bytes)
            ocr_parts = [
                pytesseract.image_to_string(image)
                for image in images
            ]
            raw_text = "\n\n".join(
                part.strip() for part in ocr_parts if part.strip()
            )
        except Exception as exc:
            raise TextExtractionError(
                "PDF appears to be scanned/image-based, but OCR failed. "
                "Make sure Tesseract OCR and its PDF rendering dependency "
                "are installed."
            ) from exc

    if not raw_text and not tables:
        raise TextExtractionError("No extractable text or tables found in PDF.")

    return ExtractedDocument(
        file_type="pdf",
        raw_text=raw_text,
        page_or_sheet_count=page_count,
        tables=tables,
    )


def extract_docx(file_bytes: bytes) -> ExtractedDocument:
    """Extract text and tables from a DOCX using python-docx."""
    doc = DocxDocument(io.BytesIO(file_bytes))

    text_parts = [p.text for p in doc.paragraphs if p.text.strip()]

    tables = []
    for table in doc.tables:
        rows = [[cell.text for cell in row.cells] for row in table.rows]
        tables.append(rows)

    if not text_parts and not tables:
        raise TextExtractionError("No extractable text or tables found in DOCX.")

    return ExtractedDocument(
        file_type="docx",
        raw_text="\n".join(text_parts),
        page_or_sheet_count=1,  # DOCX has no fixed "page" concept at parse time
        tables=tables,
    )


def extract_xlsx(file_bytes: bytes) -> ExtractedDocument:
    """Extract cell text from every sheet in an XLSX using openpyxl.
    Each sheet's rows are also captured as a 'table' for downstream use."""
    wb = load_workbook(io.BytesIO(file_bytes), data_only=True)

    text_parts = []
    tables = []

    for sheet in wb.worksheets:
        sheet_rows = []
        for row in sheet.iter_rows(values_only=True):
            row_values = [str(cell) if cell is not None else "" for cell in row]
            if any(v.strip() for v in row_values):
                sheet_rows.append(row_values)
                text_parts.append(" ".join(v for v in row_values if v))
        if sheet_rows:
            tables.append(sheet_rows)

    if not text_parts:
        raise TextExtractionError("No extractable content found in XLSX.")

    return ExtractedDocument(
        file_type="xlsx",
        raw_text="\n".join(text_parts),
        page_or_sheet_count=len(wb.worksheets),
        tables=tables,
    )


def extract_text(file_type: str, file_bytes: bytes) -> ExtractedDocument:
    """
    Single entry point — dispatches to the right extractor based on
    `file_type` (as validated by ingestion.py's validate_file()).
    """
    file_type = file_type.lower()

    if file_type == "pdf":
        return extract_pdf(file_bytes)
    elif file_type == "docx":
        return extract_docx(file_bytes)
    elif file_type == "xlsx":
        return extract_xlsx(file_bytes)
    else:
        raise TextExtractionError(f"Unsupported file type for extraction: '{file_type}'")


# ---------------------------------------------------------------------------
# Quick manual test (run: python text_extraction.py)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    # Build a tiny real DOCX in-memory to prove the DOCX path works end-to-end
    # (a fake PDF/XLSX byte string won't actually parse, since these formats
    # are binary and structured — unlike Week 1's ingestion test which only
    # needed *some* bytes to validate size/type, not real parseable content).
    doc = DocxDocument()
    doc.add_paragraph("This is a test compliance disclosure.")
    table = doc.add_table(rows=2, cols=2)
    table.rows[0].cells[0].text = "Field"
    table.rows[0].cells[1].text = "Value"
    table.rows[1].cells[0].text = "Disclosed Amount"
    table.rows[1].cells[1].text = "$1,000"

    buf = io.BytesIO()
    doc.save(buf)
    docx_bytes = buf.getvalue()

    result = extract_text("docx", docx_bytes)
    print("Extracted from DOCX:")
    print("Text:", result.raw_text)
    print("Tables:", result.tables)
    print("Sheet/page count:", result.page_or_sheet_count)
