"""
Datos semilla.
==============

Casos reales/sintéticos que alimentan el sistema:
  - COMPANIES: empresas con sus reviews (entraron vs. no entraron)
  - USER_CASES: histórico de candidatos para entrenar el modelo de probabilidad
  - PHILOSOPHERS: el comité griego que aprueba modelos de usuarios
  - OFFICIAL_MODELS: modelos de estudio recomendados por nuestro análisis
  - SAMPLE_POSTING: una posición de ejemplo para el demo end-to-end

En producción esto vendría de una base de datos; aquí va embebido para que el
pipeline corra end-to-end sin dependencias externas.
"""

from __future__ import annotations

from dataclasses import dataclass, field


# ─── Empresas y reviews ───────────────────────────────────────────────────────

@dataclass
class Review:
    accepted: bool              # ¿el candidato entró?
    rating: int                 # 1..5 (experiencia del proceso)
    test_types: tuple[str, ...] # tipos de prueba que enfrentó
    topics: tuple[str, ...]     # temas/skills que le preguntaron
    difficulty: int             # 1..5 percibida
    text: str = ""


@dataclass
class Company:
    name: str
    industry: str
    reviews: list[Review] = field(default_factory=list)


COMPANIES: dict[str, Company] = {
    "Mercurio": Company(
        "Mercurio", "fintech",
        [
            Review(True, 5, ("coding", "system_design"), ("algorithms", "system_design", "sql"), 4,
                   "Dos rondas de algoritmos y una de diseño. Estudié grafos y DP."),
            Review(True, 4, ("coding", "behavioral"), ("algorithms", "communication"), 4,
                   "El behavioral pesó mucho, usé el método STAR."),
            Review(False, 2, ("coding",), ("algorithms", "system_design"), 5,
                   "Me trabé en programación dinámica, no la dominaba."),
            Review(False, 3, ("coding", "system_design"), ("system_design",), 5,
                   "Diseño de sistemas muy pesado para mi nivel."),
            Review(True, 5, ("coding", "system_design", "behavioral"),
                   ("algorithms", "system_design", "sql", "communication"), 4, ""),
            Review(False, 2, ("coding",), ("algorithms",), 4, "Faltó practicar hashing."),
        ],
    ),
    "Helios": Company(
        "Helios", "producto/consumer",
        [
            Review(True, 5, ("product_case", "behavioral"), ("product", "communication", "sql"), 3,
                   "Caso de producto + métricas. Muy de discovery."),
            Review(True, 4, ("product_case", "analytics"), ("product", "sql"), 3, ""),
            Review(False, 3, ("product_case",), ("product",), 4,
                   "No estructuré bien el caso de producto."),
            Review(True, 4, ("behavioral", "analytics"), ("communication", "product"), 3, ""),
            Review(False, 2, ("product_case", "analytics"), ("product", "sql"), 4, ""),
        ],
    ),
    "Cronos": Company(
        "Cronos", "infraestructura/cloud",
        [
            Review(True, 4, ("coding", "system_design"), ("cloud", "system_design", "python"), 4, ""),
            Review(True, 5, ("system_design", "ops"), ("cloud", "system_design"), 4,
                   "Mucho Kubernetes y diseño tolerante a fallos."),
            Review(False, 2, ("system_design",), ("cloud", "system_design"), 5, ""),
            Review(True, 4, ("coding", "ops"), ("cloud", "python"), 3, ""),
        ],
    ),
}


# ─── Histórico de candidatos (para el modelo de probabilidad) ─────────────────
# Cada caso: features observadas + outcome (entró o no).

@dataclass
class UserCase:
    skill_coverage: float   # 0..1 qué tanto cubría las skills del puesto
    prep_ratio: float       # 0..1 horas estudiadas / recomendadas
    company_difficulty: float  # 0..1 dificultad de la empresa
    experience_years: float
    accepted: bool


def _gen_cases() -> list[UserCase]:
    # Mezcla curada para que el logistic tenga señal aprendible y realista:
    # mayor coverage + prep y menor dificultad => más probabilidad de entrar.
    raw = [
        (0.9, 0.9, 0.7, 4, True), (0.85, 0.8, 0.6, 3, True), (0.8, 0.95, 0.8, 5, True),
        (0.95, 0.7, 0.5, 2, True), (0.75, 0.85, 0.6, 3, True), (0.88, 0.9, 0.9, 6, True),
        (0.7, 0.9, 0.5, 2, True), (0.82, 0.78, 0.7, 4, True), (0.9, 0.6, 0.6, 5, True),
        (0.78, 0.88, 0.55, 3, True), (0.6, 0.95, 0.5, 1, True), (0.92, 0.85, 0.85, 7, True),
        (0.4, 0.5, 0.7, 1, False), (0.5, 0.4, 0.8, 2, False), (0.55, 0.6, 0.9, 1, False),
        (0.45, 0.7, 0.6, 0, False), (0.6, 0.5, 0.85, 2, False), (0.35, 0.4, 0.5, 1, False),
        (0.7, 0.3, 0.9, 3, False), (0.5, 0.55, 0.7, 1, False), (0.65, 0.45, 0.8, 2, False),
        (0.3, 0.6, 0.6, 0, False), (0.58, 0.5, 0.75, 1, False), (0.72, 0.4, 0.85, 2, False),
    ]
    return [UserCase(*r) for r in raw]


USER_CASES: list[UserCase] = _gen_cases()


# ─── Comité de filósofos griegos ──────────────────────────────────────────────
# Cada filósofo aporta un punto de vista (heurística) para aprobar modelos.

@dataclass
class Philosopher:
    name: str
    school: str
    viewpoint: str   # qué prioriza al evaluar un modelo de estudio


PHILOSOPHERS: list[Philosopher] = [
    Philosopher("Sócrates", "Mayéutica", "rigor"),
    Philosopher("Platón", "Academia", "coherencia"),
    Philosopher("Aristóteles", "Liceo", "evidencia"),
    Philosopher("Epicuro", "Jardín", "sostenibilidad"),
    Philosopher("Diógenes", "Cinismo", "practicidad"),
    Philosopher("Pitágoras", "Pitagóricos", "estructura"),
    Philosopher("Heráclito", "Flujo", "adaptabilidad"),
]


# ─── Posición de ejemplo (demo) ───────────────────────────────────────────────

SAMPLE_POSTING = """
Senior Backend Engineer — Mercurio (Fintech)

Buscamos una persona Senior para nuestro equipo de pagos.

Requisitos:
- Sólida experiencia en Python y diseño de sistemas escalables.
- Excelente dominio de algoritmos y estructuras de datos.
- Experiencia con SQL y bases de datos relacionales (PostgreSQL).
- Comunicación clara con stakeholders.

Nice to have:
- Experiencia con AWS / Kubernetes.
- Conocimiento de machine learning aplicado a fraude.
"""
