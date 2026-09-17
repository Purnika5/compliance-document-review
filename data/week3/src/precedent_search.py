"""Week 3 Precedent Search: threshold 0.50, top-K 5 (confirmed with Udhayveer)."""

from __future__ import annotations

import os
import uuid

from .embeddings import get_embedding_service
from .vector_store import VectorStore

PRECEDENT_SEARCH_THRESHOLD = float(os.getenv("PRECEDENT_SEARCH_THRESHOLD", "0.50"))
PRECEDENT_SEARCH_TOP_K = int(os.getenv("PRECEDENT_SEARCH_TOP_K", "5"))


def index_precedent(
    precedent_id: str | None,
    document_id: str,
    passage: str,
    outcome: str,
    explanation: str,
    vector_store: VectorStore,
) -> str:
    """Embed and store a single past decision. Returns the id used
    (generates a UUID if precedent_id is None, matching gen_random_uuid())."""
    precedent_id = precedent_id or str(uuid.uuid4())
    embedding = get_embedding_service().embed(passage)
    vector_store.add_precedent(precedent_id, document_id, passage, outcome, explanation, embedding)
    return precedent_id


def search_precedents(
    flagged_passage: str,
    vector_store: VectorStore,
    top_k: int = PRECEDENT_SEARCH_TOP_K,
    threshold: float = PRECEDENT_SEARCH_THRESHOLD,
) -> list[dict]:
    """
    Given a flagged issue's passage, return the top-K most similar past
    documents/decisions with similarity >= threshold, shaped to match the
    agreed payload contract's `precedents` field.
    """
    query_embedding = get_embedding_service().embed(flagged_passage)
    hits = vector_store.search_precedents(query_embedding, top_k, threshold)
    return [
        {
            "id": h.id,
            "document_id": h.document_id,
            "passage": h.passage,
            "outcome": h.outcome,
            "explanation": h.explanation,
            "similarity_score": h.similarity_score,
        }
        for h in hits
    ]
