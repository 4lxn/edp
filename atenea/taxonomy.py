"""
Taxonomía de skills.
====================

Catálogo canónico de skills. Cada skill define:
  - aliases: términos que aparecen en las posiciones y mapean a la skill
  - category: agrupador (lenguaje, fundamentos, sistema, etc.)
  - difficulty: 1..5 (esfuerzo relativo para dominarla)
  - modules: ruta de aprendizaje (topics) con horas estimadas y prerequisitos

Esto es la "fuente de verdad" desde la cual se detectan skills y se arma el
plan de estudio. Es intencionalmente extensible: agregar una skill nueva es
añadir una entrada al diccionario.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Module:
    """Un tema concreto de estudio dentro de una skill."""
    topic: str
    hours: float
    # topics (de la misma skill) que conviene ver antes
    prereqs: tuple[str, ...] = ()


@dataclass(frozen=True)
class Skill:
    canonical: str
    aliases: tuple[str, ...]
    category: str
    difficulty: int  # 1..5
    modules: tuple[Module, ...] = ()


# ─── Catálogo ───────────────────────────────────────────────────────────────

_SKILLS: tuple[Skill, ...] = (
    Skill(
        "python", ("python", "py", "django", "flask", "fastapi", "pandas"),
        "lenguaje", 2,
        (
            Module("Sintaxis y tipos", 6),
            Module("Estructuras de datos", 8, ("Sintaxis y tipos",)),
            Module("OOP y módulos", 8, ("Estructuras de datos",)),
            Module("Async / concurrencia", 10, ("OOP y módulos",)),
            Module("Testing (pytest)", 6, ("OOP y módulos",)),
        ),
    ),
    Skill(
        "javascript", ("javascript", "js", "node", "nodejs", "typescript", "ts", "es6"),
        "lenguaje", 2,
        (
            Module("Tipos y closures", 6),
            Module("Async / promesas", 8, ("Tipos y closures",)),
            Module("DOM y eventos", 6, ("Tipos y closures",)),
            Module("TypeScript", 8, ("Tipos y closures",)),
        ),
    ),
    Skill(
        "react", ("react", "reactjs", "jsx", "hooks", "next.js", "nextjs"),
        "frontend", 3,
        (
            Module("Componentes y props", 6),
            Module("Estado y hooks", 8, ("Componentes y props",)),
            Module("Rendering y performance", 8, ("Estado y hooks",)),
            Module("Routing y data fetching", 6, ("Estado y hooks",)),
        ),
    ),
    Skill(
        "algorithms", ("algoritmos", "algorithms", "data structures", "estructuras de datos",
                       "leetcode", "complejidad", "big o", "dsa"),
        "fundamentos", 4,
        (
            Module("Complejidad (Big-O)", 6),
            Module("Arrays y hashing", 10, ("Complejidad (Big-O)",)),
            Module("Two pointers y sliding window", 8, ("Arrays y hashing",)),
            Module("Árboles y grafos", 14, ("Arrays y hashing",)),
            Module("Programación dinámica", 16, ("Árboles y grafos",)),
        ),
    ),
    Skill(
        "system_design", ("system design", "diseño de sistemas", "arquitectura", "scalability",
                          "escalabilidad", "microservicios", "microservices", "distributed"),
        "sistema", 5,
        (
            Module("Fundamentos (latencia, throughput)", 8),
            Module("Bases de datos y sharding", 10, ("Fundamentos (latencia, throughput)",)),
            Module("Caching y colas", 8, ("Bases de datos y sharding",)),
            Module("Diseño de casos (URL shortener, feed)", 14, ("Caching y colas",)),
        ),
    ),
    Skill(
        "sql", ("sql", "postgres", "postgresql", "mysql", "bases de datos", "databases", "queries"),
        "datos", 2,
        (
            Module("SELECT y JOINs", 6),
            Module("Agregaciones y GROUP BY", 5, ("SELECT y JOINs",)),
            Module("Índices y planes de ejecución", 8, ("Agregaciones y GROUP BY",)),
            Module("Window functions", 6, ("Agregaciones y GROUP BY",)),
        ),
    ),
    Skill(
        "machine_learning", ("machine learning", "ml", "aprendizaje automático", "deep learning",
                            "pytorch", "tensorflow", "scikit", "modelos", "nlp"),
        "datos", 5,
        (
            Module("Regresión y clasificación", 10),
            Module("Validación y métricas", 8, ("Regresión y clasificación",)),
            Module("Redes neuronales", 16, ("Validación y métricas",)),
            Module("MLOps / despliegue", 10, ("Redes neuronales",)),
        ),
    ),
    Skill(
        "cloud", ("aws", "gcp", "azure", "cloud", "nube", "kubernetes", "k8s", "docker", "devops",
                 "terraform", "ci/cd"),
        "infra", 4,
        (
            Module("Contenedores (Docker)", 8),
            Module("Orquestación (Kubernetes)", 12, ("Contenedores (Docker)",)),
            Module("IaC (Terraform)", 8, ("Contenedores (Docker)",)),
            Module("Pipelines CI/CD", 8, ("Orquestación (Kubernetes)",)),
        ),
    ),
    Skill(
        "communication", ("comunicación", "communication", "stakeholders", "liderazgo", "leadership",
                         "teamwork", "trabajo en equipo", "soft skills", "presentación"),
        "soft", 2,
        (
            Module("Comunicación técnica", 5),
            Module("Behavioral interview (STAR)", 6),
            Module("Presentaciones y stakeholders", 5, ("Comunicación técnica",)),
        ),
    ),
    Skill(
        "product", ("product", "producto", "roadmap", "metrics", "métricas", "analytics", "kpi",
                   "a/b testing", "discovery"),
        "producto", 3,
        (
            Module("Métricas de producto", 6),
            Module("Priorización y roadmap", 6, ("Métricas de producto",)),
            Module("Experimentación (A/B)", 8, ("Métricas de producto",)),
        ),
    ),
)


# ─── Índices de acceso ────────────────────────────────────────────────────────

SKILLS: dict[str, Skill] = {s.canonical: s for s in _SKILLS}

# alias (lowercase) -> canonical
_ALIAS_INDEX: dict[str, str] = {}
for _s in _SKILLS:
    _ALIAS_INDEX[_s.canonical] = _s.canonical
    for _a in _s.aliases:
        _ALIAS_INDEX[_a.lower()] = _s.canonical


def all_skills() -> list[str]:
    return list(SKILLS.keys())


def resolve_alias(term: str) -> str | None:
    """Devuelve el nombre canónico de una skill para un término dado, o None."""
    return _ALIAS_INDEX.get(term.lower().strip())


def alias_index() -> dict[str, str]:
    """Copia del índice alias->canónico (para el extractor)."""
    return dict(_ALIAS_INDEX)


def total_hours(skill: str) -> float:
    s = SKILLS.get(skill)
    return sum(m.hours for m in s.modules) if s else 0.0
