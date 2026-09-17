"""
Vector-store abstraction with local (in-memory) and PostgreSQL/pgvector
backends. Functions in rule_retrieval.py / precedent_search.py take a
`vector_store` argument explicitly (dependency injection) rather than
reaching for a hidden global, so tests can use a fresh LocalVectorStore per
test with no shared state.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import numpy as np


@dataclass
class RuleRecord:
    id: str
    rule_code: str
    title: str
    description: str
    similarity_score: float


@dataclass
class PrecedentRecord:
    id: str
    document_id: str
    passage: str
    outcome: str
    explanation: str
    similarity_score: float


class VectorStore:
    def add_rule(
        self, rule_id: str, rule_code: str, title: str, description: str, embedding: np.ndarray
    ) -> None:
        raise NotImplementedError

    def add_precedent(
        self,
        precedent_id: str,
        document_id: str,
        passage: str,
        outcome: str,
        explanation: str,
        embedding: np.ndarray,
    ) -> None:
        raise NotImplementedError

    def search_rules(
        self, embedding: np.ndarray, top_k: int, threshold: float
    ) -> list[RuleRecord]:
        raise NotImplementedError

    def search_precedents(
        self, embedding: np.ndarray, top_k: int, threshold: float
    ) -> list[PrecedentRecord]:
        raise NotImplementedError


class LocalVectorStore(VectorStore):
    """In-memory implementation for tests, the demo script, and offline development."""

    def __init__(self):
        self.rules: dict[str, tuple[str, str, str, str, np.ndarray]] = {}
        self.precedents: dict[str, tuple[str, str, str, str, np.ndarray]] = {}

    def add_rule(self, rule_id, rule_code, title, description, embedding):
        self.rules[rule_id] = (rule_id, rule_code, title, description, embedding)

    def add_precedent(self, precedent_id, document_id, passage, outcome, explanation, embedding):
        self.precedents[precedent_id] = (document_id, passage, outcome, explanation, embedding)

    def search_rules(self, embedding, top_k, threshold):
        hits = []
        for rule_id, item in self.rules.items():
            score = float(np.dot(item[-1], embedding))
            if score >= threshold:
                hits.append(RuleRecord(item[0], item[1], item[2], item[3], round(score, 4)))
        hits.sort(key=lambda x: x.similarity_score, reverse=True)
        return hits[:top_k]

    def search_precedents(self, embedding, top_k, threshold):
        hits = []
        for precedent_id, item in self.precedents.items():
            score = float(np.dot(item[-1], embedding))
            if score >= threshold:
                hits.append(
                    PrecedentRecord(precedent_id, item[0], item[1], item[2], item[3], round(score, 4))
                )
        hits.sort(key=lambda x: x.similarity_score, reverse=True)
        return hits[:top_k]


class PgVectorStore(VectorStore):
    """
    Production store backed by Postgres + pgvector (see schema.sql).
    Requires psycopg2-binary and a running Postgres instance with the
    `vector` and `pgcrypto` extensions enabled.
    """

    def __init__(self, dsn: str):
        import psycopg2  # lazy import so this file works without the driver installed

        self.conn = psycopg2.connect(dsn)

    @staticmethod
    def _vector_literal(embedding: np.ndarray) -> str:
        return "[" + ",".join(str(float(v)) for v in embedding) + "]"

    def add_rule(self, rule_id, rule_code, title, description, embedding):
        sql = """
            INSERT INTO rules (id, rule_code, title, description, embedding)
            VALUES (%s, %s, %s, %s, %s::vector)
            ON CONFLICT (rule_code) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                embedding = EXCLUDED.embedding
        """
        with self.conn.cursor() as cur:
            cur.execute(sql, (rule_id, rule_code, title, description, self._vector_literal(embedding)))
        self.conn.commit()

    def add_precedent(self, precedent_id, document_id, passage, outcome, explanation, embedding):
        sql = """
            INSERT INTO precedent_decisions
                (id, document_id, passage, outcome, explanation, embedding)
            VALUES (%s, %s, %s, %s, %s, %s::vector)
            ON CONFLICT (id) DO UPDATE SET
                document_id = EXCLUDED.document_id,
                passage = EXCLUDED.passage,
                outcome = EXCLUDED.outcome,
                explanation = EXCLUDED.explanation,
                embedding = EXCLUDED.embedding
        """
        with self.conn.cursor() as cur:
            cur.execute(
                sql,
                (precedent_id, document_id, passage, outcome, explanation, self._vector_literal(embedding)),
            )
        self.conn.commit()

    def search_rules(self, embedding, top_k, threshold):
        vector = self._vector_literal(embedding)
        sql = """
            SELECT id::text, rule_code, title, description,
                   1 - (embedding <=> %s::vector) AS similarity_score
            FROM rules
            WHERE 1 - (embedding <=> %s::vector) >= %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """
        with self.conn.cursor() as cur:
            cur.execute(sql, (vector, vector, threshold, vector, top_k))
            return [RuleRecord(*row[:4], round(float(row[4]), 4)) for row in cur.fetchall()]

    def search_precedents(self, embedding, top_k, threshold):
        vector = self._vector_literal(embedding)
        sql = """
            SELECT id::text, document_id::text, passage, outcome, explanation,
                   1 - (embedding <=> %s::vector) AS similarity_score
            FROM precedent_decisions
            WHERE 1 - (embedding <=> %s::vector) >= %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """
        with self.conn.cursor() as cur:
            cur.execute(sql, (vector, vector, threshold, vector, top_k))
            return [PrecedentRecord(*row[:5], round(float(row[5]), 4)) for row in cur.fetchall()]

    def close(self):
        self.conn.close()


def get_vector_store() -> VectorStore:
    """Use pgvector when VECTOR_DATABASE_URL/DATABASE_URL is set; otherwise use the local store."""
    dsn = os.getenv("VECTOR_DATABASE_URL") or os.getenv("DATABASE_URL")
    if dsn:
        return PgVectorStore(dsn)
    return LocalVectorStore()
