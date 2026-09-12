import io

from docx import Document

from data.week2.text_extraction import extract_text


def make_docx(text: str) -> bytes:
    buffer = io.BytesIO()

    document = Document()
    document.add_paragraph(text)
    document.save(buffer)

    return buffer.getvalue()


def test_docx_text_extraction():
    docx_bytes = make_docx("Client name: Jane Doe")

    result = extract_text("docx", docx_bytes)

    assert result.file_type == "docx"
    assert "Jane Doe" in result.raw_text
    assert result.page_or_sheet_count >= 1
