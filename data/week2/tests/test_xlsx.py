import io

from openpyxl import Workbook

from data.week2.text_extraction import extract_text


def make_xlsx() -> bytes:
    buffer = io.BytesIO()

    workbook = Workbook()
    sheet = workbook.active
    sheet["A1"] = "Client Name"
    sheet["B1"] = "John Doe"

    workbook.save(buffer)

    return buffer.getvalue()


def test_xlsx_text_extraction():
    xlsx_bytes = make_xlsx()

    result = extract_text("xlsx", xlsx_bytes)

    assert result.file_type == "xlsx"
    assert "John Doe" in result.raw_text
    assert result.page_or_sheet_count >= 1
