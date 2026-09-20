import sys
import os
import datetime
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "data", "week4"))

from validate_audit_trail import find_orphaned_entries, find_gaps, run_validation
from generate_seed_corpus import generate_rules, generate_precedents


def _t(offset_seconds):
    return datetime.datetime(2026, 1, 1) + datetime.timedelta(seconds=offset_seconds)


def test_clean_audit_trail_no_issues():
    document_ids = {"doc-1", "doc-2"}
    audit_rows = [
        ("a1", "doc-1", None, "submitted", _t(0)),
        ("a2", "doc-1", "submitted", "under_review", _t(10)),
        ("a3", "doc-1", "under_review", "approved", _t(20)),
        ("a4", "doc-2", None, "submitted", _t(0)),
        ("a5", "doc-2", "submitted", "rejected", _t(10)),
    ]
    report = run_validation(document_ids, audit_rows)
    assert report["clean"] is True
    assert report["orphaned_entries"] == []
    assert report["gaps"] == []


def test_orphaned_entry_detected():
    document_ids = {"doc-1"}
    audit_rows = [
        ("a1", "doc-1", None, "submitted", _t(0)),
        ("a2", "doc-999", None, "submitted", _t(0)),  # doc-999 doesn't exist
    ]
    orphans = find_orphaned_entries(document_ids, audit_rows)
    assert len(orphans) == 1
    assert orphans[0]["document_id"] == "doc-999"


def test_broken_chain_detected_missing_transition():
    # doc-1 jumps straight from "submitted" to "approved" with no
    # "under_review" record in between -- exactly the "gap" case.
    audit_rows = [
        ("a1", "doc-1", None, "submitted", _t(0)),
        ("a2", "doc-1", "under_review", "approved", _t(10)),
    ]
    gaps = find_gaps(audit_rows)
    assert any(g["type"] == "broken_chain" for g in gaps)


def test_first_entry_with_non_null_previous_status_flagged():
    audit_rows = [
        ("a1", "doc-1", "some_status", "submitted", _t(0)),  # should be None
    ]
    gaps = find_gaps(audit_rows)
    assert any(
        g["type"] == "broken_chain" and "non-null previous_status" in g["detail"] for g in gaps
    )


def test_multiple_documents_independent_chains():
    document_ids = {"doc-1", "doc-2"}
    audit_rows = [
        ("a1", "doc-1", None, "submitted", _t(0)),
        ("a2", "doc-1", "submitted", "approved", _t(10)),
        ("a3", "doc-2", None, "submitted", _t(0)),
        ("a4", "doc-2", "wrong_status", "approved", _t(10)),  # only doc-2 broken
    ]
    report = run_validation(document_ids, audit_rows)
    assert report["clean"] is False
    assert len(report["gaps"]) == 1
    assert report["gaps"][0]["document_id"] == "doc-2"


def test_ordering_uses_created_at_not_insertion_order():
    # rows arrive out of chronological order -- validator must sort by created_at first
    audit_rows = [
        ("a2", "doc-1", "submitted", "approved", _t(10)),
        ("a1", "doc-1", None, "submitted", _t(0)),
    ]
    gaps = find_gaps(audit_rows)
    assert gaps == []  # once sorted by created_at, the chain is actually clean


def test_generate_rules_unique_codes_and_count():
    rules = generate_rules(50)
    assert len(rules) == 50
    codes = [r["rule_code"] for r in rules]
    assert len(codes) == len(set(codes))  # rule_code is UNIQUE in schema.sql
    for r in rules:
        assert set(r.keys()) == {"id", "rule_code", "title", "description"}


def test_generate_precedents_valid_outcomes_and_fk_stubs():
    precedents, documents = generate_precedents(100)
    assert len(precedents) == 100
    assert all(p["outcome"] in ("flagged", "cleared") for p in precedents)  # matches CHECK constraint
    doc_ids_in_precedents = {p["document_id"] for p in precedents}
    doc_ids_stubbed = {d["id"] for d in documents}
    assert doc_ids_in_precedents == doc_ids_stubbed  # every referenced document_id has a stub
