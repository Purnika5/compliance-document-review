# Week 4 — Data Tasks (KAN-101 + KAN-102)

Data-only deliverables — no frontend/backend changes. Confirmed schema
(from the backend/DB owner) and real Week 3 code (`data/week3/src/*`) are
used directly — nothing here is a placeholder or a guess.

## KAN-102 — Seed corpus: ~50 rules + ~100 past documents

**Files:** `data/week4/generate_seed_corpus.py`, `data/week4/load_seed_corpus.py`

Matches the real schema in `data/week3/schema.sql`:

```
rules(id, rule_code, title, description, embedding, created_at)
precedent_decisions(id, document_id, passage, outcome IN ('flagged','cleared'),
                     explanation, embedding, created_at)
```

1. **Generate the corpus:**
   ```bash
   cd data/week4
   python generate_seed_corpus.py          # defaults: 50 rules, 100 precedents
   ```
   Produces `data/rules_seed.json` (50 rules, real FINRA/SEC-style rule
   codes/titles/descriptions), `data/precedents_seed.json` (100 precedent
   documents, `outcome` only ever `flagged` or `cleared` — matches the
   schema's `CHECK` constraint), and `data/documents_seed.json` (one stub
   row per unique `document_id` referenced by a precedent).

2. **Load into the vector store:**
   ```bash
   python load_seed_corpus.py
   ```
   This calls the **real** `data.week3.src.rule_retrieval.index_rule` and
   `data.week3.src.precedent_search.index_precedent` directly — so
   embeddings come from the actual `embed_text` / `HashingEmbeddingService`
   (128-dimensional), and inserts go through the actual
   `PgVectorStore`/`LocalVectorStore` — nothing here reimplements or
   guesses at that logic. It reads `VECTOR_DATABASE_URL` or `DATABASE_URL`
   from the environment (same convention as
   `data/week3/src/vector_store.get_vector_store`) to decide whether to
   write to Postgres or the in-memory store.

### FK note (`precedent_decisions.document_id` → `documents(id)`)

The only confirmed column on `documents` is `id`. For each unique
`document_id` referenced by a precedent, `load_seed_corpus.py` attempts a
minimal `INSERT INTO documents (id) VALUES (...) ON CONFLICT (id) DO
NOTHING`. If the real `documents` table has other `NOT NULL` columns with
no default, that insert will fail for those rows — the script catches this
per-row (doesn't crash the whole batch), reports which document IDs
failed, and skips loading the corresponding precedent. **If any failures
are reported, flag it to the backend/DB owner** — either those documents
need a different creation path, or the table needs defaults for those
columns.

### Verified

- Ran `generate_seed_corpus.py` end-to-end: exactly 50 rules (unique
  `rule_code`, schema requires `UNIQUE`) and 100 precedents (`outcome`
  always `flagged`/`cleared`), plus 100 matching document stubs.
- Ran `load_seed_corpus.py` end-to-end against the **real** Week 3 code
  (`LocalVectorStore` path, since no Postgres was available in this test
  environment): **50/50 rules and 100/100 precedents loaded with zero
  errors.**
- Functional smoke test: queried the loaded corpus with
  `retrieve_rules()`/`search_precedents()` — both returned real, sensibly
  ranked hits (top precedent hit: `flagged`, similarity 0.82).

## KAN-101 — Final Audit Trail data validation

**File:** `data/week4/validate_audit_trail.py`

Confirmed schema:

```
documents(id UUID PRIMARY KEY, ...)

audit_trail(
    id UUID PRIMARY KEY,
    document_id UUID,         -- references documents.id
    previous_status VARCHAR,  -- NULL for the first entry of a document
    new_status VARCHAR,
    created_at TIMESTAMPTZ     -- entries ordered by this (no sequence_number column)
)
```

Two checks, per document, ordered by `created_at`:

1. **Orphaned entries** — an `audit_trail` row whose `document_id` doesn't
   match any row in `documents`.
2. **Gaps (broken chain)** — since there's no `sequence_number` column,
   "no gaps" means: the first entry for a document has a `NULL`
   `previous_status`, and every subsequent entry's `previous_status`
   equals the immediately-prior entry's `new_status` (by `created_at`
   order). A mismatch means a state transition happened with no audit
   record for it.

```bash
python validate_audit_trail.py
python validate_audit_trail.py --json report.json   # also write a JSON report
```

Reads `VECTOR_DATABASE_URL`/`DATABASE_URL` from the environment (same as
the loader above). Exit code `0` if clean, `1` if issues found — safe to
wire into a CI/pre-deployment check.

**One assumption flagged, not confirmed:** if two entries for the same
document share the exact same `created_at` timestamp, the script breaks
the tie using the entry's `id` for a stable order, since there's no other
ordering column. If truly-simultaneous entries are possible in practice,
flag this to the backend — a monotonic sequence column would remove the
ambiguity entirely.

## Tests

```bash
pip install faker psycopg2-binary pytest
pytest tests/ -v
```

**8/8 passing** — covers: clean audit trail, orphaned-entry detection,
broken-chain/gap detection, first-entry validation, independent
multi-document chains, out-of-order-row sorting by `created_at`, rule
generation (count + unique `rule_code`), and precedent generation (count +
valid `outcome` values + FK stub consistency).
