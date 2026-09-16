# Week 3 — Data Engineering — Gold Layer (Vector Search)
Compliance Document Review App

Covers exactly the 4 tickets assigned this week:

1. Set up vector store (pgvector)
2. Build Rule Retrieval query
3. Build Precedent Search query
4. Tune Absence Detection thresholds

This is the merged, verified version — combining the working retrieval logic
with a complete production write path. Every claim below was re-checked by
actually running the tests and the demo, not assumed from an earlier draft.

## Team-confirmed spec this implements

| Item | Value |
|---|---|
| Embedding dimension | **128** |
| Embedding approach | Deterministic hashing (`HashingEmbeddingService`) |
| Rules table | `rules` |
| Precedent table | `precedent_decisions` |
| ID scheme | UUID via `pgcrypto`'s `gen_random_uuid()` |
| `rules.rule_code` | UNIQUE |
| IVFFlat `lists` | 10 |
| Rule Retrieval | threshold `0.45`, top_k `5` |
| Precedent Search | threshold `0.50`, top_k `5` |

## Structure

```
dataeng_week3/
├── schema.sql                 # rules, precedent_decisions, document_passages, required_disclosures
├── src/
│   ├── embeddings.py          # HashingEmbeddingService — 128-dim, deterministic
│   ├── vector_store.py        # LocalVectorStore (dev/tests) + PgVectorStore (prod, full read+write)
│   ├── rule_retrieval.py      # Task 2 — threshold 0.45, top_k 5
│   ├── precedent_search.py    # Task 3 — threshold 0.50, top_k 5
│   └── absence_detection.py   # Task 4 — missing-disclosure detection
├── data/
│   ├── rules_sample.json      # sample rules (UUID ids)
│   └── precedents_sample.json # sample precedents (UUID ids)
├── tests/
│   └── test_pipeline.py       # 13 tests, all passing
├── demo.py                    # end-to-end script, prints the final /analyze payload
└── requirements.txt
```

## Run it

```bash
pip install -r requirements.txt
python demo.py          # end-to-end demo
python -m pytest tests/ # unit tests (13 passed)
```

No database needed locally — `get_vector_store()` returns an in-memory
`LocalVectorStore` unless `DATABASE_URL` / `VECTOR_DATABASE_URL` is set, in
which case it connects to real Postgres via `PgVectorStore`.

## What changed from the earlier drafts (and why)

Two versions were floating around before this one; this merges the good
parts of each and **fixes a real bug** found by actually running both:

1. **Embedding quality (fixed).** An earlier draft hashed tokens with a
   random sign flip. Shared words between two texts could cancel each other
   out instead of reinforcing the similarity score, so a paraphrased
   sentence could score *lower* than an unrelated one. Verified in testing:
   a near-duplicate of a rule's description returned zero matches at the
   confirmed 0.45 threshold. Fixed by switching to positive-only
   term-frequency hashing, adding light stemming (so "guarantee" /
   "guarantees" / "guaranteed" land in the same bucket), and stopword
   removal. Re-verified: the same paraphrase now correctly retrieves the
   rule at 0.51 similarity (see `demo.py` output).
2. **Production write path (kept from the other draft).** `PgVectorStore`
   has real `INSERT ... ON CONFLICT` SQL for both `rules` and
   `precedent_decisions`, not a placeholder. Corpus seeding can write
   directly to Postgres once `DATABASE_URL` is set.
3. **Tests now use paraphrased text, not identical strings**, so they'd
   actually have caught bug #1 rather than trivially passing on a 1.0
   self-similarity score.
4. **Schema keeps `document_passages` / `required_disclosures`** (needed to
   persist what Absence Detection checks against) and adds `created_at`
   timestamps + a `CHECK` constraint on `outcome`.
5. **`document_id` foreign keys are commented out**, not asserted, with a
   note explaining why: `precedent_decisions.document_id` and
   `document_passages.document_id` should reference Backend's `documents`
   table, but that table isn't created by this file — asserting the FK here
   would make this migration fail on a fresh database unless it's
   sequenced after Backend's migration. Uncomment once deploy order is
   confirmed with Backend.

## Env vars (all optional, defaults match the confirmed values)

```
RULE_RETRIEVAL_THRESHOLD=0.45
RULE_RETRIEVAL_TOP_K=5
PRECEDENT_SEARCH_THRESHOLD=0.50
PRECEDENT_SEARCH_TOP_K=5
ABSENCE_DETECTION_THRESHOLD=0.45
DATABASE_URL=postgres://...      # or VECTOR_DATABASE_URL — set either to use real Postgres
```

## Absence Detection notes (Task 4)

`ABSENCE_DETECTION_THRESHOLD` defaults to `0.45` (same starting point as
Rule Retrieval) but is a separate env var so it can be tuned independently —
"is this rule relevant to this passage" and "does this passage actually
satisfy this required disclosure" are different questions with different
tolerance for false negatives.

## Verified before handing off

```
python -m pytest tests/   ->  13 passed
python demo.py             ->  rule retrieval, precedent search, and absence
                                detection all return correct, non-empty,
                                threshold-appropriate results
```

Demo output for a document that guarantees returns without disclosure:
- Rule Retrieval correctly surfaces **FINRA-2210** (0.51 similarity).
- Precedent Search correctly surfaces the matching **"flagged"** precedent,
  not an unrelated "cleared" one (0.69 similarity).
- Absence Detection correctly flags both the missing risk disclosure and
  the missing fee disclosure.
