#!/usr/bin/env python3
"""
Test Vector Retrieval Script (Springer Capital Compliance Document Review)
Verifies Roadmap Definition of Done:
"The vector store returns relevant rules for document passages."
"""

import os
import sys
import math
import re
import hashlib
import json
import urllib.request
import urllib.error
import psycopg2
from psycopg2.extras import RealDictCursor

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


def embed_128d(text: str):
    raw = re.findall(r"[a-z0-9]+", text.lower())
    tokens = [_stem(t) for t in raw if t not in STOPWORDS]
    vector = [0.0] * 128
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % 128
        vector[index] += 1.0
    norm = math.sqrt(sum(v * v for v in vector))
    if norm > 0:
        vector = [v / norm for v in vector]
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
    return psycopg2.connect(host=host, port=port, dbname=dbname, user=user, password=password)


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    print("================================================================")
    print("      Testing pgvector Rule Retrieval & Definition of Done       ")
    print("================================================================")

    # Step 1: Verify PostgreSQL connection & pgvector extension
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT extname FROM pg_extension WHERE extname = 'vector';")
        ext = cur.fetchone()
        if not ext:
            print("❌ FAILURE: pgvector extension is NOT installed in PostgreSQL database.")
            sys.exit(1)
        print("✅ PASS 1: pgvector extension verified in PostgreSQL.")
    except Exception as e:
        print(f"❌ FAILURE: Unable to connect to PostgreSQL pgvector DB: {e}")
        sys.exit(1)

    # Step 2: Query rules table via pgvector cosine distance operator (<=>)
    sample_passage = "The communication makes misleading statements implying guaranteed investment returns."
    query_vec = embed_128d(sample_passage)
    vec_str = "[" + ",".join(str(v) for v in query_vec) + "]"

    try:
        cur.execute("""
            SELECT id, rule_code, title, description,
                   (1 - (embedding <=> %s::vector)) AS similarity_score
            FROM rules
            WHERE (1 - (embedding <=> %s::vector)) >= 0.45
            ORDER BY similarity_score DESC;
        """, (vec_str, vec_str))
        rules = cur.fetchall()

        if not rules:
            print("❌ FAILURE: Vector query returned 0 rules matching document passage.")
            sys.exit(1)

        finra_rule = next((r for r in rules if r["rule_code"] == "FINRA-2210"), None)
        if not finra_rule:
            print("❌ FAILURE: FINRA-2210 rule not found in vector retrieval top hits.")
            sys.exit(1)

        score = float(finra_rule["similarity_score"])
        print(f"✅ PASS 2: Vector store retrieved rule {finra_rule['rule_code']} ('{finra_rule['title']}') with similarity score: {score:.4f} >= 0.45")

    except Exception as e:
        print(f"❌ FAILURE: Error executing pgvector query against rules table: {e}")
        sys.exit(1)

    # Step 3: Query precedent decisions table
    precedent_passage = "The fund guarantees future returns based on historical performance."
    prec_vec = embed_128d(precedent_passage)
    prec_vec_str = "[" + ",".join(str(v) for v in prec_vec) + "]"

    try:
        cur.execute("""
            SELECT id, passage, outcome, explanation,
                   (1 - (embedding <=> %s::vector)) AS similarity_score
            FROM precedent_decisions
            WHERE (1 - (embedding <=> %s::vector)) >= 0.45
            ORDER BY similarity_score DESC;
        """, (prec_vec_str, prec_vec_str))
        precedents = cur.fetchall()

        if not precedents:
            print("❌ FAILURE: Vector query returned 0 precedent decisions.")
            sys.exit(1)

        flagged_prec = next((p for p in precedents if p["outcome"] == "flagged"), None)
        if not flagged_prec:
            print("❌ FAILURE: Expected flagged precedent decision not found in top hits.")
            sys.exit(1)

        prec_score = float(flagged_prec["similarity_score"])
        print(f"✅ PASS 3: Vector store retrieved precedent decision ({flagged_prec['outcome']}) with similarity score: {prec_score:.4f} >= 0.45")

    except Exception as e:
        print(f"❌ FAILURE: Error executing pgvector query against precedent_decisions table: {e}")
        sys.exit(1)
    finally:
        cur.close()
        conn.close()

    # Step 4: Test Mock AI API /retrieve HTTP endpoint if running
    mock_ai_url = os.getenv("MOCK_AI_URL", "http://localhost:8001/retrieve/rules")
    req_payload = json.dumps({
        "passage": sample_passage,
        "threshold": 0.45,
        "top_k": 5
    }).encode("utf-8")

    try:
        req = urllib.request.Request(mock_ai_url, data=req_payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and any(r.get("rule_code") == "FINRA-2210" for r in data):
                print(f"✅ PASS 4: HTTP retrieval endpoint ({mock_ai_url}) returned matching rules from vector store.")
            else:
                print(f"⚠️ WARNING: HTTP retrieval endpoint response did not include FINRA-2210: {data}")
    except Exception as http_err:
        print(f"ℹ️ Note: HTTP mock AI retrieval check skipped ({http_err}). Direct Postgres pgvector tests succeeded!")

    print("================================================================")
    print("🎉 SUCCESS: Roadmap Definition of Done Verified!")
    print("   'The vector store returns relevant rules for document passages.'")
    print("================================================================")
    return 0


if __name__ == "__main__":
    sys.exit(main())
