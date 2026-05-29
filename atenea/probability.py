"""
Modelo de probabilidad de éxito.
================================

"Construir un modelo de probabilidad y juntar todos esos casos de usuario."

Entrena una regresión logística (gradiente descendente, librería estándar)
sobre el histórico `USER_CASES`. Features:

    x = [skill_coverage, prep_ratio, (1 - company_difficulty), experience_norm]

El modelo predice P(entrar). Se entrena una sola vez y se reutiliza. Como los
features están normalizados a 0..1, los pesos son interpretables.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

from .data import USER_CASES, UserCase


def _sigmoid(z: float) -> float:
    if z < -60:
        return 0.0
    if z > 60:
        return 1.0
    return 1.0 / (1.0 + math.exp(-z))


def _featurize(c: UserCase) -> list[float]:
    return [
        c.skill_coverage,
        c.prep_ratio,
        1.0 - c.company_difficulty,          # menos dificultad => mejor
        min(c.experience_years / 8.0, 1.0),  # experiencia normalizada
    ]


@dataclass
class Prediction:
    probability: float
    confidence: str            # baja | media | alta
    drivers: list[tuple[str, float]]   # contribución de cada feature

    def pct(self) -> int:
        return round(self.probability * 100)


_FEATURE_NAMES = ("cobertura de skills", "preparación", "dificultad (inversa)", "experiencia")


class SuccessModel:
    """Regresión logística entrenada sobre los casos históricos."""

    def __init__(self, cases: list[UserCase] | None = None,
                 lr: float = 0.3, epochs: int = 3000, l2: float = 0.15) -> None:
        self._cases = cases if cases is not None else USER_CASES
        self.weights: list[float] = [0.0, 0.0, 0.0, 0.0]
        self.bias: float = 0.0
        self.n_features = 4
        self._l2 = l2
        self._train(lr, epochs)

    def _train(self, lr: float, epochs: int) -> None:
        X = [_featurize(c) for c in self._cases]
        y = [1.0 if c.accepted else 0.0 for c in self._cases]
        n = len(X)
        if n == 0:
            return
        for _ in range(epochs):
            grad_w = [0.0] * self.n_features
            grad_b = 0.0
            for xi, yi in zip(X, y):
                z = self.bias + sum(w * x for w, x in zip(self.weights, xi))
                err = _sigmoid(z) - yi
                for j in range(self.n_features):
                    grad_w[j] += err * xi[j]
                grad_b += err
            # gradiente + regularización L2 (mantiene pesos moderados => no satura)
            for j in range(self.n_features):
                self.weights[j] -= lr * (grad_w[j] / n + self._l2 * self.weights[j])
            self.bias -= lr * grad_b / n

    def _raw_predict(self, feats: list[float]) -> float:
        z = self.bias + sum(w * x for w, x in zip(self.weights, feats))
        return _sigmoid(z)

    def predict(self, skill_coverage: float, prep_ratio: float,
                company_difficulty: float, experience_years: float) -> Prediction:
        case = UserCase(skill_coverage, prep_ratio, company_difficulty,
                        experience_years, False)
        feats = _featurize(case)
        p = self._raw_predict(feats)

        # drivers = contribución (peso * valor) por feature
        contribs = [(name, round(w * x, 3))
                    for name, w, x in zip(_FEATURE_NAMES, self.weights, feats)]
        contribs.sort(key=lambda t: -abs(t[1]))

        spread = abs(p - 0.5)
        confidence = "alta" if spread > 0.3 else "media" if spread > 0.15 else "baja"

        return Prediction(probability=round(p, 4), confidence=confidence, drivers=contribs)

    def accuracy(self) -> float:
        """Accuracy in-sample (sanity check del entrenamiento)."""
        correct = 0
        for c in self._cases:
            p = self._raw_predict(_featurize(c))
            if (p >= 0.5) == c.accepted:
                correct += 1
        return correct / len(self._cases) if self._cases else 0.0
