"""
Análisis de empresa.
====================

Agrega las reviews de una empresa para responder:
  - tasa de aceptación (entraron vs. los que no)
  - qué tipos de prueba aplican
  - qué temas conviene estudiar (los que correlacionan con haber entrado)
  - dificultad percibida y sentimiento del proceso

`topic_suggestions` pondera cada tema por cuánto aparece entre los aceptados vs.
los rechazados: un tema que aparece sobre todo en gente que entró sube; uno que
aparece en gente que NO entró baja.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass

from .data import Company, COMPANIES


@dataclass
class TopicSuggestion:
    topic: str
    score: float       # >0 conviene priorizarlo
    accepted_hits: int
    rejected_hits: int


@dataclass
class CompanyInsight:
    name: str
    industry: str
    n_reviews: int
    acceptance_rate: float
    avg_difficulty: float        # 0..1 normalizada
    avg_rating: float            # 1..5
    test_types: list[tuple[str, int]]      # ordenados por frecuencia
    topic_suggestions: list[TopicSuggestion]

    def difficulty_norm(self) -> float:
        return self.avg_difficulty


class CompanyAnalyzer:
    def __init__(self, companies: dict[str, Company] | None = None) -> None:
        self._companies = companies if companies is not None else COMPANIES

    def get(self, name: str) -> Company | None:
        return self._companies.get(name)

    def analyze(self, name: str) -> CompanyInsight | None:
        company = self._companies.get(name)
        if not company or not company.reviews:
            return None

        reviews = company.reviews
        n = len(reviews)
        accepted = [r for r in reviews if r.accepted]
        rejected = [r for r in reviews if not r.accepted]

        acceptance_rate = len(accepted) / n
        avg_difficulty = sum(r.difficulty for r in reviews) / n / 5.0
        avg_rating = sum(r.rating for r in reviews) / n

        test_counter: Counter[str] = Counter()
        for r in reviews:
            test_counter.update(r.test_types)

        suggestions = self._topic_suggestions(accepted, rejected)

        return CompanyInsight(
            name=company.name,
            industry=company.industry,
            n_reviews=n,
            acceptance_rate=round(acceptance_rate, 3),
            avg_difficulty=round(avg_difficulty, 3),
            avg_rating=round(avg_rating, 2),
            test_types=test_counter.most_common(),
            topic_suggestions=suggestions,
        )

    @staticmethod
    def _topic_suggestions(accepted, rejected) -> list[TopicSuggestion]:
        acc: Counter[str] = Counter()
        rej: Counter[str] = Counter()
        for r in accepted:
            acc.update(r.topics)
        for r in rejected:
            rej.update(r.topics)

        n_acc = max(len(accepted), 1)
        n_rej = max(len(rejected), 1)

        topics = set(acc) | set(rej)
        out: list[TopicSuggestion] = []
        for t in topics:
            # frecuencia normalizada entre aceptados vs rechazados
            a = acc[t] / n_acc
            r = rej[t] / n_rej
            # un tema vale si distingue a quien entró (a alto) y/o tumbó a quien no (r alto)
            score = round(a + 0.5 * r, 3)
            out.append(TopicSuggestion(t, score, acc[t], rej[t]))
        out.sort(key=lambda s: -s.score)
        return out
