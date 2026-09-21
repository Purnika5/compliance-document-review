"""
load_seed_corpus.py
---------------------
KAN-102 — Loads the generated seed corpus into the vector store using the
REAL Week 3 code (data/week3/src/*) directly — not a reimplementation.

This calls:
  - data.week3.src.rule_retrieval.index_rule        (uses embed_text under the hood)
  - data.week3.src.precedent_search.index_precedent  (uses embed_text under the hood)
  - data.week3.src.vector_store.get_vector_store     (PgVectorStore if
    VECTOR_DATABASE_URL/DATABASE_URL is set, else the in-memory LocalVectorStore)

So embeddings, dimension (128), and the exact rules/precedent_decisions
schema all come from Week 3's own code — nothing here needs to guess or
duplicate that logic.

Foreign key note: `precedent_decisions.document_id` references
`documents(id)`. This script's `documents` argument is only known to have
an `id` column (confirmed by backend/DB owner) — other tables' required
columns aren't known here. For each unique document_id referenced by a
precedent, it attempts a minimal
`INSERT INTO documents (id) VALUES (...) ON CONFLICT (id) DO NOTHING`.
If the real `documents` table has other NOT NULL columns without a
default, that insert will fail for those rows — this is caught per-row,
reported at the end, and does NOT stop the rest of the load. Flag any
reported failures to the backend/DB owner: either those documents need to
be created a different way, or the documents table needs a default for
those columns.

Usage:
    python load_seed_corpus.py \
        --rules data/rules_seed.json \
        --precedents data/precedents_seed.json \
        --documents data/documents_seed.json

Reads VECTOR_DATABASE_URL or DATABASE_URL from the environment (same
convention as data/week3/src/vector_store.get_vector_store) to decide
whether to write to Postgres/pgvector or the in-memory store.
"""

import argparse
import json
import os
import sys
from pathlib import Path

# Make the repo root importable regardless of where this script is run from.
for _parent in Path(__file__).resolve().parents:
    if (_parent / "data" / "week3").exists():
        sys.path.insert(0, str(_parent))
        break

from data.week3.src.vector_store import get_vector_store, PgVectorStore
from data.week3.src.rule_retrieval import index_rule
from data.week3.src.precedent_search import index_precedent


BASE_DIR = os.path.realpath(os.path.dirname(__file__))


def _get_safe_path(user_path: str, base_dir: str = BASE_DIR) -> Path:
    base = os.path.realpath(base_dir)
    requested = os.path.realpath(os.path.join(base, user_path))
    if not (requested == base or requested.startswith(base + os.sep)):
        raise ValueError(f"Path traversal detected: {user_path} is outside {base}")
    return Path(requested)


def ensure_documents_exist(vector_store, documents: list[dict]) -> tuple[int, list[str]]:
    """
    Best-effort minimal insert of document stub rows so the precedent_decisions
    FK is satisfied. Only runs against the real Postgres backend (PgVectorStore);
    the in-memory LocalVectorStore has no documents table / FK to satisfy.
    Returns (num_succeeded, list_of_failed_ids).
    """
    if not isinstance(vector_store, PgVectorStore):
        return len(documents), []

    succeeded = 0
    failed = []
    for doc in documents:
        try:
            with vector_store.conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO documents (id) VALUES (%s) ON CONFLICT (id) DO NOTHING",
                    (doc["id"],),
                )
            vector_store.conn.commit()
            succeeded += 1
        except Exception as exc:
            vector_store.conn.rollback()
            failed.append(doc["id"])
            print(f"  WARNING: could not stub-insert document {doc['id']}: {exc}", file=sys.stderr)
    return succeeded, failed


def load_rules(vector_store, rules: list[dict]) -> int:
    for r in rules:
        index_rule(r["id"], r["rule_code"], r["title"], r["description"], vector_store)
    return len(rules)


def load_precedents(vector_store, precedents: list[dict]) -> int:
    loaded = 0
    for p in precedents:
        try:
            index_precedent(p["id"], p["document_id"], p["passage"], p["outcome"], p["explanation"], vector_store)
            loaded += 1
        except Exception as exc:
            # Most likely cause: the document stub insert above failed for this
            # document_id (FK violation) — reported, not fatal to the rest of the batch.
            print(f"  WARNING: could not load precedent {p['id']} (document_id={p['document_id']}): {exc}",
                  file=sys.stderr)
    return loaded


def main():
    parser = argparse.ArgumentParser(description="Load the KAN-102 seed corpus into the vector store.")
    parser.add_argument("--rules", type=str, default="data/rules_seed.json")
    parser.add_argument("--precedents", type=str, default="data/precedents_seed.json")
    parser.add_argument("--documents", type=str, default="data/documents_seed.json")
    args = parser.parse_args()

    rules_path = _get_safe_path(args.rules, BASE_DIR)
    precedents_path = _get_safe_path(args.precedents, BASE_DIR)
    documents_path = _get_safe_path(args.documents, BASE_DIR)

    rules = json.loads(rules_path.read_text(encoding="utf-8"))
    precedents = json.loads(precedents_path.read_text(encoding="utf-8"))
    documents = json.loads(documents_path.read_text(encoding="utf-8"))

    vector_store = get_vector_store()

    doc_ok, doc_failed = ensure_documents_exist(vector_store, documents)
    print(f"Document stubs ready: {doc_ok}/{len(documents)}"
          + (f" ({len(doc_failed)} failed — see warnings above)" if doc_failed else ""))

    n_rules = load_rules(vector_store, rules)
    n_precedents = load_precedents(vector_store, precedents)

    print(f"Loaded {n_rules} rules into the vector store.")
    print(f"Loaded {n_precedents}/{len(precedents)} precedent documents into the vector store.")

    if isinstance(vector_store, PgVectorStore):
        vector_store.close()


if __name__ == "__main__":
    main()
