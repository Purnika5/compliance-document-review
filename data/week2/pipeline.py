"""
pipeline.py
-----------
Week 2 — Data Engineering: Data Pipeline connecting:

ingestion -> text extraction -> PII masking -> ready-for-storage clean text.

The PII masking step calls the DevOps masking service:

    POST http://pii-masker:8002/mask

Request:
    {
        "document_id": "doc-123",
        "version": 1,
        "text": "Dear John Doe, SSN: 123-45-6789"
    }

Response:
    {
        "document_id": "doc-123",
        "version": 1,
        "masked_text": "Dear [NAME_1], SSN: [SSN_1]"
    }
"""

from dataclasses import dataclass
import json
from typing import Protocol
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

try:
    from .text_extraction import (
        extract_text,
        ExtractedDocument,
        TextExtractionError,
    )
except ImportError:
    from text_extraction import (
        extract_text,
        ExtractedDocument,
        TextExtractionError,
    )


MASKING_SERVICE_URL = "http://pii-masker:8002/mask"


class MaskingService(Protocol):
    """
    Interface for a PII masking service.

    Takes raw extracted text and returns text with PII replaced
    by structured placeholders such as [NAME_1], [SSN_1], etc.
    """

    def mask(self, text: str) -> str:
        ...


class HttpMaskingService:
    """
    Real DevOps PII masking service client.

    Sends extracted text to the DevOps masking container and
    returns the masked_text from the response.
    """

    def __init__(
        self,
        document_id: str,
        version: int,
        url: str = MASKING_SERVICE_URL,
        timeout: int = 30,
    ):
        self.document_id = document_id
        self.version = version
        self.url = url
        self.timeout = timeout

    def mask(self, text: str) -> str:
        payload = {
            "document_id": self.document_id,
            "version": self.version,
            "text": text,
        }

        request = Request(
            self.url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=self.timeout) as response:
                response_body = response.read().decode("utf-8")
                data = json.loads(response_body)

        except HTTPError as e:
            raise RuntimeError(
                f"PII masking service returned HTTP {e.code}"
            ) from e

        except URLError as e:
            raise RuntimeError(
                f"Could not connect to PII masking service at {self.url}: {e.reason}"
            ) from e

        except json.JSONDecodeError as e:
            raise RuntimeError(
                "PII masking service returned invalid JSON"
            ) from e

        masked_text = data.get("masked_text")

        if masked_text is None:
            raise RuntimeError(
                "PII masking service response does not contain 'masked_text'"
            )

        return masked_text


@dataclass
class PipelineResult:
    file_type: str
    masked_text: str
    tables: list
    page_or_sheet_count: int


def run_pipeline(
    file_type: str,
    file_bytes: bytes,
    document_id: str,
    version: int = 1,
    masking_service: MaskingService | None = None,
) -> PipelineResult:
    """
    Full Week 2 pipeline:

        1. Extract text from the uploaded file.
        2. Send extracted text to the real PII masking service.
        3. Return masked text together with extracted tables and counts.

    A masking_service can optionally be injected for unit tests.
    In normal/production usage, the real HttpMaskingService is used.
    """

    try:
        extracted: ExtractedDocument = extract_text(
            file_type,
            file_bytes,
        )
    except TextExtractionError as e:
        raise TextExtractionError(
            f"Pipeline failed at extraction step: {e}"
        ) from e

    if masking_service is None:
        masking_service = HttpMaskingService(
            document_id=document_id,
            version=version,
        )

    try:
        masked_text = masking_service.mask(extracted.raw_text)
    except Exception as e:
        raise RuntimeError(
            f"Pipeline failed at PII masking step: {e}"
        ) from e

    return PipelineResult(
        file_type=extracted.file_type,
        masked_text=masked_text,
        tables=extracted.tables,
        page_or_sheet_count=extracted.page_or_sheet_count,
    )


# ---------------------------------------------------------------------------
# Quick manual test
# Run from data/week2:
#     python pipeline.py
#
# NOTE:
# The pii-masker container must be running for this test to succeed.
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import io
    from docx import Document as DocxDocument

    doc = DocxDocument()
    doc.add_paragraph(
        "Client name: Jane Doe. SSN: 123-45-6789."
    )

    buf = io.BytesIO()
    doc.save(buf)
    docx_bytes = buf.getvalue()

    result = run_pipeline(
        file_type="docx",
        file_bytes=docx_bytes,
        document_id="manual-test-doc",
        version=1,
    )

    print("Pipeline result:")
    print("File type:", result.file_type)
    print("Masked text:", result.masked_text)
    print("Page/sheet count:", result.page_or_sheet_count)
