"""Week 3 Rule Retrieval: threshold 0.45, top-K 5 (confirmed with Udhayveer)."""

from __future__ import annotations

import os
import uuid

from .embeddings import get_embedding_service
from .vector_store import VectorStore

RULE_RETRIEVAL_THRESHOLD = float(os.getenv("RULE_RETRIEVAL_THRESHOLD", "0.45"))
RULE_RETRIEVAL_TOP_K = int(os.getenv("RULE_RETRIEVAL_TOP_K", "5"))


def index_rule(
    rule_id: str | None,
    rule_code: str,
    title: str,
    description: str,
    vector_store: VectorStore,
) -> str:
    """Embed and store a single compliance rule. Returns the id used
    (generates a UUID if rule_id is None, matching Postgres's gen_random_uuid())."""
    rule_id = rule_id or str(uuid.uuid4())
    embedding = get_embedding_service().embed(f"{title}. {description}")
    vector_store.add_rule(rule_id, rule_code, title, description, embedding)
    return rule_id


def retrieve_rules(
    passage: str,
    vector_store: VectorStore,
    top_k: int = RULE_RETRIEVAL_TOP_K,
    threshold: float = RULE_RETRIEVAL_THRESHOLD,
) -> list[dict]:
    """
    Given a masked document passage, return the top-K matching compliance
    rules with similarity >= threshold, shaped to match the agreed
    Backend -> AI Service payload contract's `retrieved_rules` field.
    """
    query_embedding = get_embedding_service().embed(passage)
    hits = vector_store.search_rules(query_embedding, top_k, threshold)
    return [
        {
            "id": h.id,
            "rule_code": h.rule_code,
            "title": h.title,
            "description": h.description,
            "similarity_score": h.similarity_score,
        }
        for h in hits
    ]
