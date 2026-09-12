import io

from reportlab.pdfgen import canvas

from data.week2.text_extraction import extract_text


def make_pdf(text: str) -> bytes:
    buffer = io.BytesIO()

    pdf = canvas.Canvas(buffer)
    pdf.drawString(100, 750, text)
    pdf.save()

    return buffer.getvalue()


def test_pdf_text_extraction():
    pdf_bytes = make_pdf("Client name: John Doe")

    result = extract_text("pdf", pdf_bytes)

    assert result.file_type == "pdf"
    assert "John Doe" in result.raw_text
    assert result.page_or_sheet_count >= 1
