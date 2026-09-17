"""
Week 3 Data Engineering tests, aligned with the team-confirmed design:
128D deterministic embeddings, `rules` / `precedent_decisions` tables, UUIDs,
confirmed retrieval thresholds/top-K, and absence detection.

Tests deliberately use *paraphrased* text (different wording, same meaning)
rather than identical strings for index vs. query -- an identical-string
test would trivially score 1.0 similarity regardless of whether the
embedding actually generalizes, and would not have caught the sign-hashing
bug found during review (see embeddings.py docstring).
"""

import sys
import uuid
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.absence_detection import detect_missing_disclosures
from src.embeddings import EMBEDDING_DIMENSION, HashingEmbeddingService, get_embedding_service
from src.precedent_search import index_precedent, search_precedents
from src.rule_retrieval import index_rule, retrieve_rules
from src.vector_store import LocalVectorStore


def test_embedding_dimension_is_128():
    vec = get_embedding_service().embed("sample text")
    assert vec.shape == (128,)
    assert EMBEDDING_DIMENSION == 128


def test_embedding_is_deterministic_and_normalized():
    service = HashingEmbeddingService()
    a = service.embed("FINRA disclosure requirement")
    b = service.embed("FINRA disclosure requirement")
    assert np.allclose(a, b)
    assert np.isclose(np.linalg.norm(a), 1.0)


def test_shared_wording_scores_higher_than_unrelated_text():
    # Guards against the sign-hashing regression: two texts sharing several
    # domain words must score meaningfully higher than two unrelated texts.
    service = HashingEmbeddingService()
    a = service.embed("The fund guarantees returns and implies guaranteed investment performance.")
    b = service.embed("This statement implies guaranteed investment returns to the public.")
    unrelated = service.embed("The office printer is out of paper again.")
    assert float(a @ b) > float(a @ unrelated)
    assert float(a @ b) > 0.3


def test_index_rule_generates_uuid_when_not_provided():
    store = LocalVectorStore()
    rule_id = index_rule(None, "FINRA-2210", "Communications with the Public", "misleading statements", store)
    assert uuid.UUID(rule_id)


def test_rule_retrieval_matches_paraphrased_passage_above_threshold():
    store = LocalVectorStore()
    index_rule(
        None,
        "FINRA-2210",
        "Communications with the Public",
        "Prohibits false, exaggerated, unwarranted, or misleading statements in "
        "communications with the public, including implying guaranteed investment returns.",
        store,
    )
    # Paraphrased, not identical -- validates real generalization, not string-matching.
    results = retrieve_rules(
        "The communication makes misleading statements implying guaranteed investment returns.",
        store,
        top_k=5,
        threshold=0.45,
    )
    assert len(results) == 1
    assert results[0]["rule_code"] == "FINRA-2210"
    assert results[0]["similarity_score"] >= 0.45


def test_rule_retrieval_respects_top_k():
    store = LocalVectorStore()
    for i in range(10):
        index_rule(None, f"CODE-{i}", "Disclosure rule", "fee expense charge disclosure required", store)
    results = retrieve_rules("fee expense charge disclosure required", store, top_k=3, threshold=0.0)
    assert len(results) == 3


def test_rule_retrieval_returns_empty_above_threshold():
    store = LocalVectorStore()
    index_rule(None, "CODE-1", "Fee disclosure", "fees must be disclosed", store)
    assert retrieve_rules("completely unrelated text about the weather", store, threshold=0.9) == []


def test_precedent_search_matches_paraphrased_flagged_issue():
    store = LocalVectorStore()
    doc_id = str(uuid.uuid4())
    index_precedent(
        None,
        doc_id,
        "Historical returns guarantee future fund performance.",
        "flagged",
        "Guaranteed performance statement violates FINRA 2210.",
        store,
    )
    # Paraphrased flagged issue, not identical text.
    results = search_precedents(
        "The fund guarantees future returns based on historical performance.", store, threshold=0.50
    )
    assert len(results) == 1
    assert results[0]["outcome"] == "flagged"
    assert results[0]["document_id"] == doc_id


def test_precedent_id_is_uuid_when_not_provided():
    store = LocalVectorStore()
    precedent_id = index_precedent(None, str(uuid.uuid4()), "some passage", "cleared", "no issue", store)
    assert uuid.UUID(precedent_id)


def test_precedent_search_respects_top_k():
    store = LocalVectorStore()
    for i in range(10):
        index_precedent(None, str(uuid.uuid4()), "fee disclosure not provided to client", "flagged", "x", store)
    results = search_precedents("fee disclosure not provided to client", store, top_k=4, threshold=0.0)
    assert len(results) == 4


def test_absence_detection_flags_missing_disclosure():
    required = [{"id": "req-001", "rule_id": "rule-004", "description": "risk of loss disclosure required"}]
    missing = detect_missing_disclosures(required, ["This fund discusses historical performance only."], threshold=0.9)
    assert len(missing) == 1
    assert missing[0]["status"] == "missing"


def test_absence_detection_does_not_flag_present_disclosure():
    required = [{"id": "req-001", "rule_id": "rule-004", "description": "risk of loss disclosure"}]
    missing = detect_missing_disclosures(
        required, ["This investment includes risk of loss disclosure as required by law."], threshold=0.45
    )
    assert missing == []


def test_absence_detection_empty_document_flags_everything():
    required = [
        {"id": "req-001", "rule_id": "rule-004", "description": "risk disclosure"},
        {"id": "req-002", "rule_id": "rule-005", "description": "fee disclosure"},
    ]
    assert len(detect_missing_disclosures(required, [])) == 2
