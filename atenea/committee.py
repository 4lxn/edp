"""
Comité de filósofos (democracia).
=================================

"Modelos propios del usuario, pre-aprobados por un comité de modelos con
distintos puntos de vista basado en la antigua Grecia según los filósofos, y
darle prioridad a la decisión con más votos (democracia)."

Cada filósofo es una heurística con un punto de vista distinto. Evalúa el
modelo de un usuario y emite un voto (aprobar / rechazar) con su razón. El
modelo se pre-aprueba si la MAYORÍA vota a favor (empate = no aprobado).

El comité es deliberadamente diverso para que ningún sesgo único decida: rigor,
coherencia, evidencia, sostenibilidad, practicidad, estructura y adaptabilidad.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from . import taxonomy
from .data import PHILOSOPHERS, Philosopher


@dataclass
class Vote:
    philosopher: str
    school: str
    approve: bool
    reason: str


@dataclass
class Verdict:
    approved: bool
    votes: list[Vote]
    tally: tuple[int, int]   # (a favor, en contra)

    def summary(self) -> str:
        a, r = self.tally
        estado = "APROBADO" if self.approved else "RECHAZADO"
        return f"{estado} por el comité ({a} a favor, {r} en contra)"


# Una "submission" es cualquier objeto con estos atributos (duck typing):
#   skills: list[str], total_hours: float, modules_count: int,
#   has_schedule: bool, evidence_sources: int, target_role: str


def _categories(skills: list[str]) -> set[str]:
    cats = set()
    for s in skills:
        sk = taxonomy.SKILLS.get(s)
        if sk:
            cats.add(sk.category)
    return cats


# ─── Puntos de vista (cada uno devuelve (approve, reason)) ────────────────────

def _socrates(m) -> tuple[bool, str]:  # rigor: profundidad por skill
    n = max(len(m.skills), 1)
    depth = m.total_hours / n
    if depth >= 8:
        return True, f"hay profundidad ({depth:.0f}h por skill); resiste el examen"
    return False, f"superficial ({depth:.0f}h por skill); no resiste preguntas a fondo"


def _platon(m) -> tuple[bool, str]:  # coherencia con la forma ideal del rol
    known = [s for s in m.skills if s in taxonomy.SKILLS]
    if not known:
        return False, "las skills no corresponden a ninguna forma reconocible"
    scattered = len(_categories(known)) > 4
    if scattered:
        return False, "skills dispersas; el modelo no tiene una forma coherente"
    return True, "el conjunto de skills es coherente con la idea del rol"


def _aristoteles(m) -> tuple[bool, str]:  # evidencia empírica
    if m.evidence_sources >= 3:
        return True, f"respaldado por {m.evidence_sources} casos/fuentes"
    return False, f"poca evidencia ({m.evidence_sources} fuentes); falta base empírica"


def _epicuro(m) -> tuple[bool, str]:  # sostenibilidad (evitar burnout)
    if m.total_hours <= 120:
        return True, f"carga sostenible ({m.total_hours:.0f}h); evita el agotamiento"
    return False, f"plan agotador ({m.total_hours:.0f}h); insostenible para el alumno"


def _diogenes(m) -> tuple[bool, str]:  # practicidad, sin relleno
    if m.has_schedule and len(m.skills) <= 6:
        return True, "accionable y enfocado, sin relleno"
    if not m.has_schedule:
        return False, "sin agenda concreta; pura teoría"
    return False, "demasiadas skills; pierde el foco"


def _pitagoras(m) -> tuple[bool, str]:  # estructura/orden
    if m.has_schedule and m.modules_count >= len(m.skills):
        return True, "bien estructurado: módulos ordenados y agenda"
    return False, "estructura insuficiente; faltan módulos u orden"


def _heraclito(m) -> tuple[bool, str]:  # adaptabilidad
    if m.has_schedule:
        return True, "el plan fluye hacia la fecha y se puede ajustar"
    return False, "rígido; no se adapta a un calendario"


_RUBRIC = {
    "rigor": _socrates,
    "coherencia": _platon,
    "evidencia": _aristoteles,
    "sostenibilidad": _epicuro,
    "practicidad": _diogenes,
    "estructura": _pitagoras,
    "adaptabilidad": _heraclito,
}


class Committee:
    def __init__(self, philosophers: list[Philosopher] | None = None) -> None:
        self.philosophers = philosophers if philosophers is not None else PHILOSOPHERS

    def deliberate(self, model) -> Verdict:
        votes: list[Vote] = []
        for ph in self.philosophers:
            judge = _RUBRIC.get(ph.viewpoint)
            if judge is None:
                continue
            approve, reason = judge(model)
            votes.append(Vote(ph.name, ph.school, approve, reason))

        favor = sum(1 for v in votes if v.approve)
        contra = len(votes) - favor
        approved = favor > contra  # mayoría estricta (empate = rechazado)
        return Verdict(approved=approved, votes=votes, tally=(favor, contra))
