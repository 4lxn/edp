"""
Reviews y puntuación de modelos.
================================

"Que los modelos vayan subiendo de puntuación para calificarlos; al inicio no
hay reviews visibles hasta que ya tengan un número considerable."

Reglas:
  - `MIN_VISIBLE` reviews para que el rating se muestre públicamente. Antes,
    el modelo aparece como "en evaluación".
  - El ranking NO usa el promedio crudo (injusto con pocos votos): usa un
    promedio bayesiano que parte de un prior y se acerca al promedio real
    conforme entran más reviews → la puntuación "sube" con la evidencia.
"""

from __future__ import annotations

from dataclasses import dataclass, field

MIN_VISIBLE = 5          # reviews necesarias para mostrar el rating
_PRIOR_MEAN = 3.0        # estrella esperada a priori (neutral)
_PRIOR_WEIGHT = 5.0      # cuántas "reviews virtuales" pesa el prior


@dataclass
class ReviewEntry:
    stars: int           # 1..5
    helpful: int = 0
    text: str = ""


@dataclass
class RatingView:
    count: int
    visible: bool
    display: str                 # texto a mostrar al usuario
    raw_average: float           # promedio real (interno)
    bayesian_score: float        # usado para rankear


class ReviewLedger:
    """Acumula reviews de un modelo y calcula su puntuación."""

    def __init__(self) -> None:
        self._entries: list[ReviewEntry] = []

    def add(self, stars: int, helpful: int = 0, text: str = "") -> None:
        if not 1 <= stars <= 5:
            raise ValueError("stars debe estar entre 1 y 5")
        self._entries.append(ReviewEntry(stars, helpful, text))

    @property
    def count(self) -> int:
        return len(self._entries)

    def raw_average(self) -> float:
        if not self._entries:
            return 0.0
        return sum(e.stars for e in self._entries) / len(self._entries)

    def bayesian_score(self) -> float:
        """Promedio bayesiano: (prior*W + suma) / (W + n)."""
        n = len(self._entries)
        total = sum(e.stars for e in self._entries)
        return (_PRIOR_MEAN * _PRIOR_WEIGHT + total) / (_PRIOR_WEIGHT + n)

    def view(self) -> RatingView:
        n = self.count
        visible = n >= MIN_VISIBLE
        if visible:
            display = f"★ {self.raw_average():.1f} ({n} reviews)"
        elif n == 0:
            display = "Sin reviews — recién publicado"
        else:
            display = f"En evaluación ({n}/{MIN_VISIBLE} reviews)"
        return RatingView(
            count=n,
            visible=visible,
            display=display,
            raw_average=round(self.raw_average(), 3),
            bayesian_score=round(self.bayesian_score(), 4),
        )
