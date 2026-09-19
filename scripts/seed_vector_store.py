#!/usr/bin/env python3
"""
Seed Vector Store Script (Springer Capital Compliance Document Review)
Populates PostgreSQL pgvector database with compliance rules, precedent decisions,
and required disclosures using 128-dimensional deterministic embeddings.
"""

import os
import sys
import json
import re
import math
import hashlib
from typing import List, Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

# --------------------------------------------------
# Week 3 Deterministic 128D Embedding Engine
# --------------------------------------------------

STOPWORDS = {
    "the", "a", "an", "of", "in", "on", "with", "or", "and", "to", "for",
    "is", "are", "was", "were", "be", "based", "this", "that", "all",
    "no", "not", "over", "last", "including", "under", "as", "by", "it",
}


def _stem(token: str) -> str:
    if len(token) > 5 and token.endswith("ee"):
        token = token[:-1]
    for suffix in ("ations", "ation", "ing", "edly", "ed", "es", "s"):
        if len(token) > len(suffix) + 3 and token.endswith(suffix):
            return token[:-len(suffix)]
    return token


def embed_128d(text: str) -> List[float]:
    raw = re.findall(r"[a-z0-9]+", text.lower())
    tokens = [_stem(t) for t in raw if t not in STOPWORDS]
    vector = [0.0] * 128
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % 128
        vector[index] += 1.0
    norm = math.sqrt(sum(v * v for v in vector))
    if norm > 0:
        vector = [round(v / norm, 6) for v in vector]
    return vector


def get_db_connection():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return psycopg2.connect(db_url)
    
    host = os.getenv("DB_HOST", "localhost")
    port = int(os.getenv("DB_PORT", "5432"))
    dbname = os.getenv("DB_NAME", "compliance_doc_review")
    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "postgres")
    
    return psycopg2.connect(
        host=host,
        port=port,
        dbname=dbname,
        user=user,
        password=password
    )


def seed_vector_store():
    print("[Seed Vector Store] Connecting to PostgreSQL...")
    conn = get_db_connection()
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # 1. Verify pgvector extension
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        conn.commit()
        print("[Seed Vector Store] pgvector extension verified.")

        # 2. Load rules sample
        script_dir = os.path.dirname(os.path.abspath(__file__))
        repo_root = os.path.abspath(os.path.join(script_dir, ".."))
        rules_file = os.path.join(repo_root, "data", "week3", "data", "rules_sample.json")
        precedents_file = os.path.join(repo_root, "data", "week3", "data", "precedents_sample.json")

        if os.path.exists(rules_file):
            with open(rules_file, "r", encoding="utf-8") as f:
                rules_data = json.load(f)
        else:
            rules_data = [
                {
                    "id": "2469c4cc-b396-4dd8-b675-2a42592b6527",
                    "rule_code": "FINRA-2210",
                    "title": "Communications with the Public",
                    "description": "Prohibits false, exaggerated, unwarranted, or misleading statements in communications with the public, including implying guaranteed investment returns.",
                },
                {
                    "id": "11a9dbe6-cd19-404c-90f9-270af4394bc8",
                    "rule_code": "SEC-206",
                    "title": "Fiduciary Duty Disclosure",
                    "description": "Requires advisors to disclose all material conflicts of interest, including compensation received for recommending specific products.",
                },
                {
                    "id": "4d8c6873-5453-478e-a102-fadd6a98edcf",
                    "rule_code": "FINRA-2111",
                    "title": "Suitability Obligation",
                    "description": "Requires a reasonable basis to believe a recommended transaction or investment strategy is suitable for the customer based on their profile.",
                },
                {
                    "id": "872e0907-2dfa-4790-9ad0-227c25f6fe2d",
                    "rule_code": "SEC-RiskDisclosure",
                    "title": "Risk Factor Disclosure",
                    "description": "Requires clear disclosure of principal risks of loss associated with an investment, including that past performance does not guarantee future results.",
                },
                {
                    "id": "d3a750a2-f653-4744-bad2-acd25f97ee35",
                    "rule_code": "FINRA-2214",
                    "title": "Fee and Expense Disclosure",
                    "description": "Requires clear and prominent disclosure of all fees, expenses, and charges associated with a recommended product.",
                }
            ]

        rule_id_map = {}
        for r in rules_data:
            rule_id = r.get("id")
            code = r["rule_code"]
            title = r["title"]
            desc = r["description"]
            text_to_embed = f"{title}. {desc}"
            vec = embed_128d(text_to_embed)
            vec_str = "[" + ",".join(str(v) for v in vec) + "]"

            cur.execute("""
                INSERT INTO rules (id, rule_code, title, description, embedding)
                VALUES (%s, %s, %s, %s, %s::vector)
                ON CONFLICT (rule_code) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    embedding = EXCLUDED.embedding
                RETURNING id;
            """, (rule_id, code, title, desc, vec_str))
            inserted_id = cur.fetchone()["id"]
            rule_id_map[code] = inserted_id
            print(f"[Seed Vector Store] Seeded rule: {code} - {title}")

        # 3. Seed required disclosures (for Absence Detection)
        disclosures_data = [
            ("FINRA-2210", "Must include prominent disclosure that past performance is no guarantee of future results."),
            ("SEC-206", "Must include complete description of advisor compensation and third-party fee sharing arrangements."),
            ("SEC-RiskDisclosure", "Must detail principal loss factors and liquidity constraints associated with the fund."),
            ("FINRA-2214", "Must include comprehensive fee schedule detailing advisory fees and underlying fund expense ratios.")
        ]

        for code, desc in disclosures_data:
            if code in rule_id_map:
                r_id = rule_id_map[code]
                cur.execute("""
                    INSERT INTO required_disclosures (rule_id, description)
                    SELECT %s, %s
                    WHERE NOT EXISTS (
                        SELECT 1 FROM required_disclosures WHERE rule_id = %s AND description = %s
                    );
                """, (r_id, desc, r_id, desc))

        # 4. Load precedents sample
        if os.path.exists(precedents_file):
            with open(precedents_file, "r", encoding="utf-8") as f:
                precedents_data = json.load(f)
        else:
            precedents_data = [
                {
                    "id": "9607ba1d-2d3f-4e7b-b8f9-a0c88393e648",
                    "document_id": "d2653c14-3c69-490d-bb3e-32a36f3dbe39",
                    "passage": "Historical returns guarantee future fund performance.",
                    "outcome": "flagged",
                    "explanation": "Guaranteed performance statement violates FINRA 2210.",
                },
                {
                    "id": "307f605a-4a79-4983-acc2-ed37530fc31a",
                    "document_id": "14d11e95-53f4-4acf-bbb1-c241f71248ae",
                    "passage": "This fund has consistently outperformed the market every single year without exception.",
                    "outcome": "flagged",
                    "explanation": "Exaggerated, unverifiable performance claim; misleading under FINRA 2210.",
                },
                {
                    "id": "a41cae56-7694-40c3-adb1-d79847518be8",
                    "document_id": "65e800e9-79a0-4192-be92-a88a761d117e",
                    "passage": "The advisor did not disclose the commission earned from recommending this annuity product.",
                    "outcome": "flagged",
                    "explanation": "Undisclosed conflict of interest violates SEC 206 fiduciary duty rules.",
                },
                {
                    "id": "629275f6-86fe-4774-868c-13f2b9b1c6ea",
                    "document_id": "f90e9d5c-c8aa-4c54-96d4-f350e9bfb03b",
                    "passage": "Past performance is not indicative of future results, and all investments carry risk of loss.",
                    "outcome": "cleared",
                    "explanation": "Proper risk disclosure present; satisfies SEC risk disclosure requirement.",
                }
            ]

        # Get or create a default advisor ID for document foreign key if needed
        cur.execute("SELECT id FROM users WHERE role = 'Advisor' LIMIT 1;")
        user_row = cur.fetchone()
        advisor_id = user_row["id"] if user_row else None

        for p in precedents_data:
            p_id = p["id"]
            doc_id = p["document_id"]
            passage = p["passage"]
            outcome = p["outcome"]
            explanation = p["explanation"]
            vec = embed_128d(passage)
            vec_str = "[" + ",".join(str(v) for v in vec) + "]"

            # Check if doc_id exists in documents table
            cur.execute("SELECT id FROM documents WHERE id = %s;", (doc_id,))
            doc_exists = cur.fetchone()
            if not doc_exists:
                cur.execute("""
                    INSERT INTO documents (id, title, description, file_name, file_path, file_size, mime_type, status, advisor_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO NOTHING;
                """, (
                    doc_id,
                    f"Precedent Reference Doc {doc_id[:8]}",
                    "Sample historical document reference for precedent retrieval",
                    "precedent_ref.pdf",
                    "uploads/documents/sample_compliance_filing.pdf",
                    1024,
                    "application/pdf",
                    "Approved",
                    advisor_id
                ))

            cur.execute("""
                INSERT INTO precedent_decisions (id, document_id, passage, outcome, explanation, embedding)
                VALUES (%s, %s, %s, %s, %s, %s::vector)
                ON CONFLICT (id) DO UPDATE SET
                    passage = EXCLUDED.passage,
                    outcome = EXCLUDED.outcome,
                    explanation = EXCLUDED.explanation,
                    embedding = EXCLUDED.embedding;
            """, (p_id, doc_id, passage, outcome, explanation, vec_str))
            print(f"[Seed Vector Store] Seeded precedent decision: {p_id[:8]} [{outcome}]")

        conn.commit()
        print("[Seed Vector Store] Vector store seeding completed successfully!")
    except Exception as e:
        conn.rollback()
        print(f"[Seed Vector Store] Error during vector seeding: {e}", file=sys.stderr)
        raise e
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    seed_vector_store()
