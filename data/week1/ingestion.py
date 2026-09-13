"""
ingestion.py
------------
Week 1 — Data Engineering: File upload handler + metadata extraction.

Responsibilities:
  - Accept an uploaded file (PDF, DOCX, or XLSX) from an Advisor.
  - Validate the file type and size.
  - Extract metadata: size, type, advisor ID, original filename.
  - Save the raw file to storage and insert a row into `documents`.

This module is intentionally storage-agnostic: `save_to_storage()` writes to
local disk for now, but is the one place to swap in S3/Azure Blob later.

Note: advisor_id is a UUID (not int), matching the Backend's UUID primary
key convention used throughout the schema (see schema.sql).
"""

import os
import uuid
from datetime import datetime
from dataclasses import dataclass

ALLOWED_EXTENSIONS = {"pdf", "docx", "xlsx"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB cap
STORAGE_DIR = "storage/documents"


@dataclass
class DocumentMetadata:
    advisor_id: uuid.UUID
    file_name: str
    file_type: str
    file_size_bytes: int
    storage_path: str
    submitted_at: datetime


class IngestionError(Exception):
    """Raised when an uploaded file fails validation."""
    pass


def validate_file(file_name: str, file_size_bytes: int) -> str:
    """Validate extension and size. Returns the normalized extension."""
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise IngestionError(
            f"Unsupported file type '.{ext}'. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    if file_size_bytes <= 0:
        raise IngestionError("File is empty.")

    if file_size_bytes > MAX_FILE_SIZE_BYTES:
        raise IngestionError(
            f"File too large ({file_size_bytes} bytes). Max allowed is {MAX_FILE_SIZE_BYTES} bytes."
        )

    return ext


def save_to_storage(file_bytes: bytes, original_file_name: str) -> str:
    """
    Saves the raw file bytes to disk under a unique name (to avoid collisions)
    and returns the storage path. Swap this out for S3/Blob upload later —
    the rest of the pipeline only cares about the returned path string.
    """
    os.makedirs(STORAGE_DIR, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}_{original_file_name}"
    storage_path = os.path.join(STORAGE_DIR, unique_name)

    with open(storage_path, "wb") as f:
        f.write(file_bytes)

    return storage_path


def ingest_document(advisor_id: uuid.UUID, file_name: str, file_bytes: bytes) -> DocumentMetadata:
    """
    Main entry point: validates, stores, and extracts metadata for an
    uploaded document. Returns a DocumentMetadata object ready to be
    inserted into the `documents` table (see schema.sql).

    advisor_id must be a UUID matching an existing row in `users(id)`.

    Raises IngestionError on invalid input — the caller (API layer) is
    responsible for turning that into an appropriate HTTP error response.
    """
    file_size_bytes = len(file_bytes)
    file_type = validate_file(file_name, file_size_bytes)

    storage_path = save_to_storage(file_bytes, file_name)

    return DocumentMetadata(
        advisor_id=advisor_id,
        file_name=file_name,
        file_type=file_type,
        file_size_bytes=file_size_bytes,
        storage_path=storage_path,
        submitted_at=datetime.utcnow(),
    )


# SQL to resolve the 'Pending' status UUID at insert time. `documents.status_id`
# is NOT NULL, so every insert must include a real status_id — this query is
# the single source of truth for "what UUID does 'Pending' currently have".
GET_PENDING_STATUS_ID_SQL = "SELECT id FROM document_statuses WHERE name = 'Pending';"


def to_insert_dict(meta: DocumentMetadata, status_id: uuid.UUID) -> dict:
    """Convert DocumentMetadata into a dict matching the `documents` table
    columns, ready for an INSERT (via psycopg2, SQLAlchemy, etc.).

    `status_id` is required (not optional) because `documents.status_id` is
    NOT NULL in the schema. The caller must resolve it first, e.g.:

        cur.execute(GET_PENDING_STATUS_ID_SQL)
        pending_status_id = cur.fetchone()[0]
        row = to_insert_dict(meta, pending_status_id)

    Newly ingested documents always start as 'Pending', so callers resolve
    that specific status_id and pass it in here — this function will not
    silently default it, to avoid a mismatch with whatever UUID
    'Pending' actually has in the database.
    """
    return {
        "advisor_id": meta.advisor_id,
        "file_name": meta.file_name,
        "file_type": meta.file_type,
        "file_size_bytes": meta.file_size_bytes,
        "storage_path": meta.storage_path,
        "status_id": status_id,
        "submitted_at": meta.submitted_at,
    }


# ---------------------------------------------------------------------------
# Quick manual test (run: python ingestion.py)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    fake_pdf_bytes = b"%PDF-1.4 fake content for testing"
    result = ingest_document(
        advisor_id=uuid.uuid4(),
        file_name="disclosure_form.pdf",
        file_bytes=fake_pdf_bytes,
    )
    print("Ingested successfully:")
    print(result)

    # In real usage, status_id comes from querying document_statuses (see
    # GET_PENDING_STATUS_ID_SQL above). Faked here since there's no live DB
    # connection in this standalone test.
    fake_pending_status_id = uuid.uuid4()
    print("\nReady for DB insert:")
    print(to_insert_dict(result, status_id=fake_pending_status_id))
