"""
Week 3 Absence Detection: detect required disclosures missing from a
document. Tune similarity thresholds so the system can detect when an
expected disclosure is MISSING -- the harder, inverse case of normal
retrieval (which only tells you what IS present).

For each required disclosure, embed its description and compare it against
every passage in the document. If no passage scores >= threshold, the
disclosure is considered missing.
"""

from __future__ import annotations

import os

import numpy as np

from .embeddings import get_embedding_service

# Separate/tunable from Rule Retrieval's threshold -- "is this rule relevant
# to this passage" and "does this passage satisfy this required disclosure"
# are different questions with different tolerance for false negatives.
ABSENCE_DETECTION_THRESHOLD = float(os.getenv("ABSENCE_DETECTION_THRESHOLD", "0.45"))


def detect_missing_disclosures(
    required_disclosures: list[dict],
    document_passages: list[str],
    threshold: float = ABSENCE_DETECTION_THRESHOLD,
) -> list[dict]:
    """
    required_disclosures: list of {"id", "rule_id", "description"}
    document_passages: masked passages from one document version

    Returns the subset of required_disclosures that were NOT found in any
    passage, each annotated with the best similarity score it did reach:

        {"id", "rule_id", "description", "best_similarity_score", "status": "missing"}
    """
    embedder = get_embedding_service()

    if not document_passages:
        return [
            {**d, "best_similarity_score": 0.0, "status": "missing"}
            for d in required_disclosures
        ]

    passage_vectors = np.stack([embedder.embed(p) for p in document_passages])

    missing = []
    for disclosure in required_disclosures:
        query = embedder.embed(disclosure["description"])
        best_score = float(np.max(passage_vectors @ query))
        if best_score < threshold:
            missing.append(
                {**disclosure, "best_similarity_score": round(best_score, 4), "status": "missing"}
            )
    return missing
