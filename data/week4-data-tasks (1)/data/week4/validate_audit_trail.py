"""
validate_audit_trail.py
------------------------
KAN-101 — Final Audit Trail data validation.

Runs a check across the demo dataset confirming every state change was
correctly recorded in the Audit Trail — no gaps, no orphaned entries.

Schema (confirmed with the backend/DB owner):

    documents(id UUID PRIMARY KEY, ...)

    audit_trail(
        id UUID PRIMARY KEY,
        document_id UUID,        -- references documents.id
        previous_status VARCHAR, -- NULL for the first entry of a document
        new_status VARCHAR,
        created_at TIMESTAMPTZ    -- entries are ordered by this (no sequence_number column)
    )

Two checks are run, per document, ordered by created_at:

  1. Orphaned entries — an audit_trail row whose document_id does not
     exist in documents. These are entries with nothing to attach to.

  2. Gaps (broken chain) — since there's no explicit sequence_number
     column, "no gaps" is checked as: the first entry for a document must
     have a NULL previous_status, and every subsequent entry's
     previous_status must equal the immediately-prior entry's new_status
     (by created_at order). A mismatch here means a state transition
     happened without an audit record for it, or entries are missing —
     exactly what "gaps" means without a numeric sequence to check.

Note on ordering ties: if two entries for the same document share the
exact same created_at timestamp, this script breaks the tie using the
entries' id for a stable, deterministic order — since there's no other
ordering column available. Flag to the backend if truly-simultaneous
entries are possible in practice; a monotonic sequence column would
remove this ambiguity.

Connection: reads VECTOR_DATABASE_URL or DATABASE_URL from the environment
(same convention as data/week3/src/vector_store.get_vector_store), so this
points at the same demo Postgres as the seed corpus loader.

Usage:
    python validate_audit_trail.py
    python validate_audit_trail.py --json report.json   # also write a JSON report

Exit code: 0 if clean, 1 if any gaps or orphans were found.
"""

import argparse
import json
import os
import sys
from collections import defaultdict

CONFIG = {
    "documents_table": "documents",
    "documents_id_col": "id",
    "audit_table": "audit_trail",
    "audit_id_col": "id",
    "audit_document_id_col": "document_id",
    "audit_previous_status_col": "previous_status",
    "audit_new_status_col": "new_status",
    "audit_created_at_col": "created_at",
}


def get_connection():
    import psycopg2
    dsn = os.getenv("VECTOR_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not dsn:
        raise RuntimeError(
            "Set VECTOR_DATABASE_URL or DATABASE_URL to point at the demo Postgres "
            "(same convention as data/week3/src/vector_store.get_vector_store)."
        )
    return psycopg2.connect(dsn)


def fetch_data(conn):
    with conn.cursor() as cur:
        cur.execute(f"SELECT {CONFIG['documents_id_col']} FROM {CONFIG['documents_table']};")
        document_ids = {str(row[0]) for row in cur.fetchall()}

        cur.execute(
            f"""
            SELECT {CONFIG['audit_id_col']}, {CONFIG['audit_document_id_col']},
                   {CONFIG['audit_previous_status_col']}, {CONFIG['audit_new_status_col']},
                   {CONFIG['audit_created_at_col']}
            FROM {CONFIG['audit_table']}
            ORDER BY {CONFIG['audit_document_id_col']}, {CONFIG['audit_created_at_col']},
                     {CONFIG['audit_id_col']};
            """
        )
        audit_rows = cur.fetchall()

    return document_ids, audit_rows


def find_orphaned_entries(document_ids: set, audit_rows: list) -> list:
    """Audit entries whose document_id has no matching document."""
    orphans = []
    for audit_id, document_id, prev_status, new_status, created_at in audit_rows:
        if str(document_id) not in document_ids:
            orphans.append({"audit_id": str(audit_id), "document_id": str(document_id)})
    return orphans


def find_gaps(audit_rows: list) -> list:
    """
    For each document: entries ordered by created_at (id as tiebreak) must
    form an unbroken chain — first entry's previous_status is NULL, and
    each entry's previous_status equals the prior entry's new_status.
    """
    by_document = defaultdict(list)
    for audit_id, document_id, prev_status, new_status, created_at in audit_rows:
        by_document[str(document_id)].append(
            {
                "audit_id": str(audit_id),
                "previous_status": prev_status,
                "new_status": new_status,
                "created_at": created_at,
            }
        )

    gaps = []
    for document_id, entries in by_document.items():
        entries.sort(key=lambda e: (e["created_at"], e["audit_id"]))

        prior_new_status = None
        for i, entry in enumerate(entries):
            if i == 0:
                if entry["previous_status"] is not None:
                    gaps.append(
                        {
                            "type": "broken_chain",
                            "document_id": document_id,
                            "audit_id": entry["audit_id"],
                            "detail": "first entry has a non-null previous_status",
                        }
                    )
            elif entry["previous_status"] != prior_new_status:
                gaps.append(
                    {
                        "type": "broken_chain",
                        "document_id": document_id,
                        "audit_id": entry["audit_id"],
                        "detail": f"previous_status '{entry['previous_status']}' does not match "
                        f"prior entry's new_status '{prior_new_status}'",
                    }
                )
            prior_new_status = entry["new_status"]

    return gaps


def run_validation(document_ids: set, audit_rows: list) -> dict:
    orphans = find_orphaned_entries(document_ids, audit_rows)
    gaps = find_gaps(audit_rows)
    return {
        "documents_checked": len(document_ids),
        "audit_entries_checked": len(audit_rows),
        "orphaned_entries": orphans,
        "gaps": gaps,
        "clean": len(orphans) == 0 and len(gaps) == 0,
    }


BASE_DIR = os.path.realpath(os.getcwd())


def _get_safe_path(user_path: str, base_dir: str = BASE_DIR) -> str:
    base = os.path.realpath(base_dir)
    requested = os.path.realpath(os.path.join(base, user_path))
    if not (requested == base or requested.startswith(base + os.sep)):
        raise ValueError(f"Path traversal detected: {user_path} is outside {base}")
    return requested


def main():
    parser = argparse.ArgumentParser(description="Validate the Audit Trail for gaps and orphaned entries.")
    parser.add_argument("--json", type=str, default=None, help="Optional path to also write a JSON report")
    args = parser.parse_args()

    conn = get_connection()
    try:
        document_ids, audit_rows = fetch_data(conn)
    finally:
        conn.close()

    report = run_validation(document_ids, audit_rows)

    print(f"Documents checked:      {report['documents_checked']}")
    print(f"Audit entries checked:  {report['audit_entries_checked']}")
    print(f"Orphaned entries found: {len(report['orphaned_entries'])}")
    print(f"Gaps found:             {len(report['gaps'])}")

    if report["orphaned_entries"]:
        print("\nOrphaned entries:")
        for o in report["orphaned_entries"]:
            print(f"  - audit_id={o['audit_id']} document_id={o['document_id']} (no matching document)")

    if report["gaps"]:
        print("\nGaps / broken chains:")
        for g in report["gaps"]:
            print(f"  - {g}")

    if args.json:
        safe_json_path = _get_safe_path(args.json)
        with open(safe_json_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, default=str)
        print(f"\nJSON report written to {safe_json_path}")

    if report["clean"]:
        print("\nResult: CLEAN — every state change was correctly recorded, no gaps, no orphaned entries.")
        sys.exit(0)
    else:
        print("\nResult: ISSUES FOUND — see above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
