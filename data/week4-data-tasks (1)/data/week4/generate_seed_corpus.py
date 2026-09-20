"""
generate_seed_corpus.py
------------------------
KAN-102 — Seed corpus: ~50 rules + ~100 past documents.

Generates content matching the REAL schema already defined in
data/week3/schema.sql and used by data/week3/src/rule_retrieval.py /
precedent_search.py:

    rules(id, rule_code, title, description, embedding, created_at)
    precedent_decisions(id, document_id, passage, outcome IN ('flagged','cleared'),
                         explanation, embedding, created_at)

`precedent_decisions.document_id` has a foreign key to `documents(id)`, so
this script also generates a matching `documents_seed.json` with one row
per document_id referenced by a precedent, containing only the `id` column
(the only documents column confirmed by the backend). If the real
`documents` table has other NOT NULL columns with no default, the loader
(`load_seed_corpus.py`) will report which document rows it couldn't insert
rather than failing the whole batch — see that script's docstring.

Output (in data/week4/data/):
  - rules_seed.json         (~50 rules)
  - precedents_seed.json    (~100 precedent documents)
  - documents_seed.json     (one row per unique document_id referenced above)
"""

import argparse
import json
import random
import uuid
from pathlib import Path

from faker import Faker

fake = Faker()
Faker.seed(42)
random.seed(42)

# Real-world FINRA/SEC rule families, following the same rule_code
# convention as data/week3/data/rules_sample.json.
RULE_CATALOG = [
    ("FINRA-2210", "Communications with the Public",
     "Prohibits false, exaggerated, unwarranted, or misleading statements in "
     "communications with the public, including implying guaranteed investment returns."),
    ("SEC-206", "Fiduciary Duty Disclosure",
     "Requires advisors to disclose all material conflicts of interest, including "
     "compensation received for recommending specific products."),
    ("FINRA-2111", "Suitability Obligation",
     "Requires a reasonable basis to believe a recommended transaction or investment "
     "strategy is suitable for the customer based on their profile."),
    ("SEC-RiskDisclosure", "Risk Factor Disclosure",
     "Requires clear disclosure of principal risks of loss associated with an "
     "investment, including that past performance does not guarantee future results."),
    ("FINRA-2214", "Fee and Expense Disclosure",
     "Requires clear and prominent disclosure of all fees, expenses, and charges "
     "associated with a recommended product."),
    ("FINRA-3110", "Supervision",
     "Requires a system to supervise the activities of associated persons reasonably "
     "designed to achieve compliance with applicable securities laws."),
    ("SEC-204", "Recordkeeping Requirements",
     "Requires investment advisers to make and keep true, accurate, and current "
     "books and records relating to their advisory business."),
    ("FINRA-2090", "Know Your Customer",
     "Requires reasonable diligence to know and retain essential facts concerning "
     "every customer at account opening and throughout the relationship."),
    ("SEC-AntiFraud", "Anti-Fraud Provision",
     "Prohibits any device, scheme, or artifice to defraud any client or prospective client."),
    ("FINRA-2150", "Improper Use of Customer Funds",
     "Prohibits improper use or borrowing of a customer's funds or securities."),
]


def _variant_description(base_description: str) -> str:
    """Light templated variation so 50 rules aren't 10 exact repeats."""
    suffixes = [
        "",
        " This applies to all advisory accounts regardless of size.",
        " Violations may result in disciplinary action and required remediation.",
        " Advisors must document their compliance with this requirement in the client file.",
        " This requirement applies at account opening and on an ongoing basis.",
    ]
    return base_description + random.choice(suffixes)


def generate_rules(n: int) -> list[dict]:
    rules = []
    used_codes = set()
    for i in range(n):
        code, title, description = random.choice(RULE_CATALOG)
        # rule_code is UNIQUE in the schema — suffix duplicates to keep them unique
        variant_code = code if code not in used_codes else f"{code}-v{i}"
        used_codes.add(variant_code)
        rules.append(
            {
                "id": str(uuid.uuid4()),
                "rule_code": variant_code,
                "title": title,
                "description": _variant_description(description),
            }
        )
    return rules


def generate_precedents(n: int) -> list[dict]:
    """
    Returns (precedents, documents) — documents is the deduped list of
    {id: document_id} rows needed to satisfy the FK, one per unique
    document_id referenced by a precedent.
    """
    outcomes_weighted = ["flagged"] * 6 + ["cleared"] * 4  # matches real-world skew: most flagged

    flagged_examples = [
        ("Historical returns guarantee future fund performance.",
         "Guaranteed performance statement violates FINRA 2210."),
        ("This fund has consistently outperformed the market every single year without exception.",
         "Exaggerated, unverifiable performance claim; misleading under FINRA 2210."),
        ("The advisor did not disclose the commission earned from recommending this annuity product.",
         "Undisclosed conflict of interest violates SEC 206 fiduciary duty rules."),
        ("This investment carries no risk of principal loss under any market condition.",
         "False risk-free claim; violates SEC risk disclosure requirement."),
        ("We guarantee you will double your investment within two years.",
         "Prohibited guaranteed-return claim under FINRA 2210."),
    ]
    cleared_examples = [
        ("Past performance is not indicative of future results, and all investments carry risk of loss.",
         "Proper risk disclosure present; satisfies SEC risk disclosure requirement."),
        ("All applicable fees and expenses for this account are itemized in the attached fee schedule.",
         "Fee disclosure complete; satisfies FINRA 2214."),
        ("The advisor disclosed the referral fee received from the fund manager prior to recommendation.",
         "Conflict of interest properly disclosed; satisfies SEC 206."),
        ("This recommendation was made after reviewing the client's risk tolerance and investment horizon.",
         "Suitability basis documented; satisfies FINRA 2111."),
    ]

    precedents = []
    documents = {}
    for _ in range(n):
        outcome = random.choice(outcomes_weighted)
        passage, explanation = random.choice(flagged_examples if outcome == "flagged" else cleared_examples)
        document_id = str(uuid.uuid4())
        documents[document_id] = {"id": document_id}
        precedents.append(
            {
                "id": str(uuid.uuid4()),
                "document_id": document_id,
                "passage": passage,
                "outcome": outcome,
                "explanation": explanation,
            }
        )
    return precedents, list(documents.values())


def main():
    parser = argparse.ArgumentParser(description="Generate the KAN-102 seed corpus.")
    parser.add_argument("--rules", type=int, default=50)
    parser.add_argument("--precedents", type=int, default=100)
    parser.add_argument("--out-dir", type=str, default=str(Path(__file__).parent / "data"))
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    rules = generate_rules(args.rules)
    precedents, documents = generate_precedents(args.precedents)

    (out_dir / "rules_seed.json").write_text(json.dumps(rules, indent=2), encoding="utf-8")
    (out_dir / "precedents_seed.json").write_text(json.dumps(precedents, indent=2), encoding="utf-8")
    (out_dir / "documents_seed.json").write_text(json.dumps(documents, indent=2), encoding="utf-8")

    print(f"Generated {len(rules)} rules -> {out_dir / 'rules_seed.json'}")
    print(f"Generated {len(precedents)} precedents -> {out_dir / 'precedents_seed.json'}")
    print(f"Generated {len(documents)} document stubs -> {out_dir / 'documents_seed.json'}")


if __name__ == "__main__":
    main()
