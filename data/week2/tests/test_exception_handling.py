"""
tests/test_exception_handling.py

Verifies corrupted / password-encrypted / malformed files raise a
structured FileProcessingError (HTTP 400) instead of crashing the worker
with an unhandled exception (PdfReadError, BadZipFile, etc.).
"""
import io
import zipfile

import pytest
from pypdf import PdfWriter

from data.week2.text_extraction import extract_text, FileProcessingError


def make_corrupted_pdf_bytes() -> bytes:
    return b"%PDF-1.4\nthis is not a real pdf body, truncated garbage"


def make_encrypted_pdf_bytes() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    writer.encrypt(user_password="secret123", owner_password="ownersecret")
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


def make_corrupted_docx_bytes() -> bytes:
    return b"NOT_A_ZIP_FILE_AT_ALL"  # triggers BadZipFile


def make_fake_zip_but_not_docx_bytes() -> bytes:
    # a valid zip, but not a valid docx package -> PackageNotFoundError path
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("hello.txt", "not a real docx structure")
    return buf.getvalue()


def make_corrupted_xlsx_bytes() -> bytes:
    return b"NOT_A_ZIP_FILE_EITHER"  # triggers BadZipFile


def test_corrupted_pdf_raises_file_processing_error_not_crash():
    with pytest.raises(FileProcessingError) as exc_info:
        extract_text("pdf", make_corrupted_pdf_bytes())
    assert exc_info.value.status_code == 400
    assert exc_info.value.to_response() == {"error": "File corrupted or password-protected"}


def test_encrypted_pdf_raises_file_processing_error_not_crash():
    with pytest.raises(FileProcessingError) as exc_info:
        extract_text("pdf", make_encrypted_pdf_bytes())
    assert exc_info.value.status_code == 400


def test_corrupted_docx_raises_file_processing_error_not_crash():
    with pytest.raises(FileProcessingError) as exc_info:
        extract_text("docx", make_corrupted_docx_bytes())
    assert exc_info.value.status_code == 400


def test_fake_zip_docx_raises_file_processing_error_not_crash():
    with pytest.raises(FileProcessingError) as exc_info:
        extract_text("docx", make_fake_zip_but_not_docx_bytes())
    assert exc_info.value.status_code == 400


def test_corrupted_xlsx_raises_file_processing_error_not_crash():
    with pytest.raises(FileProcessingError) as exc_info:
        extract_text("xlsx", make_corrupted_xlsx_bytes())
    assert exc_info.value.status_code == 400
