"""
Detección de skills de una posición.
====================================

Dado el texto de una posición (job posting), el `SkillExtractor`:
  - normaliza y tokeniza el texto (uni/bigramas/trigramas)
  - mapea términos a skills canónicas vía la taxonomía
  - distingue secciones "requeridas" vs "deseables" (nice to have)
  - infiere seniority (junior / mid / senior)
  - pondera cada skill por frecuencia y por la sección donde aparece

El resultado es un `RoleProfile`: lo que la posición busca en específico.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from . import taxonomy


# Palabras que marcan el inicio de una sección de requisitos "duros"
_REQUIRED_MARKERS = (
    "requisitos", "requirements", "required", "must have", "imprescindible",
    "qualifications", "lo que buscamos", "what you'll need", "necesitas",
)
# Palabras que marcan una sección "deseable"
_NICE_MARKERS = (
    "nice to have", "deseable", "plus", "bonus", "preferido", "preferred",
    "valoramos", "extra",
)

_SENIORITY = {
    "senior": ("senior", "sr.", "sr ", "lead", "staff", "principal", "líder", "experto"),
    "junior": ("junior", "jr.", "jr ", "trainee", "becario", "intern", "entry", "graduate",
               "sin experiencia"),
}


@dataclass
class DetectedSkill:
    skill: str          # canónico
    weight: float       # 0..1 importancia relativa dentro de la posición
    required: bool      # True si aparece en sección requerida
    mentions: int       # cuántas veces se detectó


@dataclass
class RoleProfile:
    title: str
    seniority: str                       # junior | mid | senior
    skills: list[DetectedSkill]
    raw_terms: dict[str, int] = field(default_factory=dict)

    def skill_names(self) -> list[str]:
        return [s.skill for s in self.skills]

    def weight_of(self, skill: str) -> float:
        for s in self.skills:
            if s.skill == skill:
                return s.weight
        return 0.0

    def top(self, n: int = 5) -> list[DetectedSkill]:
        return self.skills[:n]


def _normalize(text: str) -> str:
    text = text.lower()
    # conservar letras (incl. acentos), números, # . / + y espacios
    text = re.sub(r"[^a-z0-9áéíóúñ#./+ \n]", " ", text)
    return text


def _ngrams(tokens: list[str], n: int) -> list[str]:
    return [" ".join(tokens[i:i + n]) for i in range(len(tokens) - n + 1)]


def _detect_seniority(title: str, body: str) -> str:
    hay = (title + " " + body).lower()
    for level, markers in _SENIORITY.items():
        if any(m in hay for m in markers):
            return level
    return "mid"


class SkillExtractor:
    def __init__(self) -> None:
        self._alias = taxonomy.alias_index()
        # longitud máxima de n-grama a probar (los aliases más largos son trigramas)
        self._max_n = max(len(a.split()) for a in self._alias) if self._alias else 1

    def extract(self, posting: str, title: str = "") -> RoleProfile:
        body = _normalize(posting)
        lines = body.split("\n")

        # cuenta de menciones por skill y si apareció en sección requerida/deseable
        mentions: dict[str, int] = {}
        in_required: dict[str, bool] = {}
        raw: dict[str, int] = {}

        section = "neutral"  # neutral | required | nice
        for line in lines:
            stripped = line.strip()
            if any(m in stripped for m in _NICE_MARKERS):
                section = "nice"
            elif any(m in stripped for m in _REQUIRED_MARKERS):
                section = "required"

            tokens = stripped.split()
            found_terms = self._match_terms(tokens)
            for term, canonical in found_terms:
                raw[term] = raw.get(term, 0) + 1
                mentions[canonical] = mentions.get(canonical, 0) + 1
                # required gana sobre nice/neutral; una vez required, se queda
                if section == "required":
                    in_required[canonical] = True
                else:
                    in_required.setdefault(canonical, section != "nice")

        skills = self._score(mentions, in_required)
        seniority = _detect_seniority(title, posting)
        return RoleProfile(
            title=title or "(posición sin título)",
            seniority=seniority,
            skills=skills,
            raw_terms=raw,
        )

    def _match_terms(self, tokens: list[str]) -> list[tuple[str, str]]:
        """Encuentra (término, canónico) en una línea, prefiriendo n-gramas largos."""
        found: list[tuple[str, str]] = []
        consumed = [False] * len(tokens)
        for n in range(self._max_n, 0, -1):
            grams = _ngrams(tokens, n)
            for i, g in enumerate(grams):
                if any(consumed[i:i + n]):
                    continue
                canonical = self._alias.get(g)
                if canonical:
                    found.append((g, canonical))
                    for j in range(i, i + n):
                        consumed[j] = True
        return found

    @staticmethod
    def _score(mentions: dict[str, int], in_required: dict[str, bool]) -> list[DetectedSkill]:
        if not mentions:
            return []
        # peso bruto = menciones * (1.5 si es requerida)
        raw_weights = {
            sk: cnt * (1.5 if in_required.get(sk) else 1.0)
            for sk, cnt in mentions.items()
        }
        total = sum(raw_weights.values()) or 1.0
        out = [
            DetectedSkill(
                skill=sk,
                weight=round(raw_weights[sk] / total, 4),
                required=bool(in_required.get(sk)),
                mentions=mentions[sk],
            )
            for sk in mentions
        ]
        out.sort(key=lambda d: (-d.weight, not d.required, d.skill))
        return out
