"""
Tienda de modelos.
==================

"Tendrán modelos recomendados por nuestro análisis y modelos de los usuarios.
En tienda estarán los nuestros recomendados y, esperamos, hasta arriba los de
más estrellas. Los propios del usuario van pre-aprobados por el comité."

- Modelos OFICIALES: curados por nuestro análisis (boost de recomendación).
- Modelos de USUARIO: deben pasar por el `Committee` antes de publicarse.
- Ranking: recomendados primero; dentro de cada grupo, por puntuación bayesiana
  (justa con pocos votos). Las reviews solo se muestran tras `MIN_VISIBLE`.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .reviews import ReviewLedger, RatingView
from .committee import Committee, Verdict


@dataclass
class StudyModel:
    model_id: str
    title: str
    target_role: str
    author: str
    skills: list[str]
    total_hours: float
    modules_count: int
    has_schedule: bool
    evidence_sources: int
    official: bool = False
    ledger: ReviewLedger = field(default_factory=ReviewLedger)

    def rating(self) -> RatingView:
        return self.ledger.view()


@dataclass
class StoreListing:
    model: StudyModel
    rating: RatingView
    recommended: bool


class ModelStore:
    def __init__(self, committee: Committee | None = None) -> None:
        self._models: dict[str, StudyModel] = {}
        self._committee = committee or Committee()
        self._rejected: dict[str, Verdict] = {}

    # ── publicación ──────────────────────────────────────────────────────────

    def add_official(self, model: StudyModel) -> StudyModel:
        model.official = True
        self._models[model.model_id] = model
        return model

    def submit_user_model(self, model: StudyModel) -> tuple[bool, Verdict]:
        """Somete un modelo de usuario al comité. Solo se publica si lo aprueba."""
        model.official = False
        verdict = self._committee.deliberate(model)
        if verdict.approved:
            self._models[model.model_id] = model
        else:
            self._rejected[model.model_id] = verdict
        return verdict.approved, verdict

    def rejection_of(self, model_id: str) -> Verdict | None:
        return self._rejected.get(model_id)

    # ── consultas ──────────────────────────────────────────────────────────--

    def get(self, model_id: str) -> StudyModel | None:
        return self._models.get(model_id)

    def review(self, model_id: str, stars: int, helpful: int = 0, text: str = "") -> None:
        m = self._models.get(model_id)
        if not m:
            raise KeyError(model_id)
        m.ledger.add(stars, helpful, text)

    def listing(self, target_role: str | None = None) -> list[StoreListing]:
        """Catálogo ordenado: oficiales recomendados arriba, luego por estrellas."""
        models = list(self._models.values())
        if target_role:
            models = [m for m in models if self._matches_role(m, target_role)]

        listings = [
            StoreListing(model=m, rating=m.rating(), recommended=m.official)
            for m in models
        ]
        # orden: recomendado primero, luego mayor puntuación bayesiana, luego más reviews
        listings.sort(key=lambda l: (
            not l.recommended,
            -l.rating.bayesian_score,
            -l.rating.count,
            l.model.title,
        ))
        return listings

    def recommended_for(self, target_role: str, n: int = 3) -> list[StoreListing]:
        return self.listing(target_role)[:n]

    @staticmethod
    def _matches_role(model: StudyModel, target_role: str) -> bool:
        role = target_role.lower()
        if model.target_role.lower() in role or role in model.target_role.lower():
            return True
        # match laxo por palabras clave del rol
        return any(w in model.target_role.lower() for w in role.split() if len(w) > 3)
