"""
Week 3 - Data Engineering - end-to-end demo.

Run:  python demo.py

Seeds a small local corpus (rules + precedents), then runs:
  1. Rule Retrieval        (threshold 0.45, top_k 5)
  2. Precedent Search      (threshold 0.50, top_k 5)
  3. Absence Detection     (finds missing required disclosures)

And prints the final `/analyze` request payload in the exact shape agreed
with Backend/AI (masked_text + retrieved_rules + precedents).
"""

import sys
import json
from pathlib import Path

base_dir = Path(__file__).resolve().parent
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

from src.absence_detection import detect_missing_disclosures
from src.precedent_search import index_precedent, search_precedents
from src.rule_retrieval import index_rule, retrieve_rules
from src.vector_store import get_vector_store


def seed_corpus(vector_store):
    base_dir = Path(__file__).resolve().parent

    with open(base_dir / "data" / "rules_sample.json") as f:
        rules = json.load(f)
    for r in rules:
        index_rule(r["id"], r["rule_code"], r["title"], r["description"], vector_store)

    with open(base_dir / "data" / "precedents_sample.json") as f:
        precedents = json.load(f)
    for p in precedents:
        index_precedent(
            p["id"], p["document_id"], p["passage"], p["outcome"], p["explanation"], vector_store
        )

    print(f"Seeded {len(rules)} rules and {len(precedents)} precedent_decisions into the local vector store.\n")


def main():
    vector_store = get_vector_store()
    seed_corpus(vector_store)

    # --- A masked document passage coming in from the ingestion pipeline ---
    document_id = "doc-uuid"
    version = 1
    masked_passage = (
        "This investment fund guarantees returns of 12% annually with no risk of loss, "
        "implying guaranteed investment returns to the public based on historical fund "
        "performance over the last 5 years."
    )

    print("=" * 70)
    print("1) RULE RETRIEVAL  (threshold 0.45, top_k 5)")
    print("=" * 70)
    retrieved_rules = retrieve_rules(masked_passage, vector_store)
    print(json.dumps(retrieved_rules, indent=2))

    print("\n" + "=" * 70)
    print("2) PRECEDENT SEARCH  (threshold 0.50, top_k 5)")
    print("=" * 70)
    precedents = search_precedents(masked_passage, vector_store)
    print(json.dumps(precedents, indent=2))

    print("\n" + "=" * 70)
    print("3) ABSENCE DETECTION  (are required disclosures missing from this passage?)")
    print("=" * 70)
    required_disclosures = [
        {
            "id": "req-001",
            "rule_id": "rule-004",
            "description": "Past performance does not guarantee future results and all investments carry risk of loss.",
        },
        {
            "id": "req-002",
            "rule_id": "rule-005",
            "description": "All fees, expenses, and charges associated with the recommended product must be disclosed.",
        },
    ]
    # This passage does NOT contain a fee disclosure or a proper risk
    # disclosure -> both should come back as missing.
    document_passages = [masked_passage]
    missing = detect_missing_disclosures(required_disclosures, document_passages)
    print(json.dumps(missing, indent=2))

    print("\n" + "=" * 70)
    print("FINAL PAYLOAD -> AI Service  (/analyze request contract)")
    print("=" * 70)
    payload = {
        "document_id": document_id,
        "version": version,
        "masked_text": masked_passage,
        "retrieved_rules": retrieved_rules,
        "precedents": precedents,
    }
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
