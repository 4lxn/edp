"""
Pipeline end-to-end.
====================

Orquesta todo el sistema: dada una posición (+ perfil del usuario), produce un
`CareerPlan` personalizado:

    posición ─► skills detectadas ─► análisis de empresa ─► plan de estudio
             ─► agenda hacia la fecha de pruebas ─► probabilidad (hoy vs. meta)
             ─► modelos recomendados de la tienda

Es la pieza que une "todos esos casos de usuario" en un plan accionable.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from .skills import SkillExtractor, RoleProfile
from .company import CompanyAnalyzer, CompanyInsight
from .study_plan import StudyPlanGenerator, StudyPlan
from .scheduler import Scheduler, Schedule
from .probability import SuccessModel, Prediction
from .store import ModelStore, StudyModel, StoreListing


@dataclass
class CareerPlan:
    role: RoleProfile
    company: CompanyInsight | None
    study_plan: StudyPlan
    schedule: Schedule
    probability_now: Prediction
    probability_target: Prediction
    recommended_models: list[StoreListing]

    # ── reporte legible ───────────────────────────────────────────────────────
    def render(self) -> str:
        lines: list[str] = []
        r = self.role
        lines.append(f"═══ PLAN PARA: {r.title} ({r.seniority}) ═══\n")

        lines.append("Skills que busca la posición:")
        for s in r.skills:
            tag = "requerida" if s.required else "deseable"
            lines.append(f"  • {s.skill:<16} peso {s.weight:.0%}  ({tag}, {s.mentions} menciones)")

        if self.company:
            c = self.company
            lines.append(f"\nEmpresa — {c.name} [{c.industry}]:")
            lines.append(f"  Tasa de aceptación: {c.acceptance_rate:.0%} sobre {c.n_reviews} reviews")
            lines.append(f"  Dificultad: {c.avg_difficulty:.0%}  |  experiencia del proceso: ★{c.avg_rating}")
            lines.append("  Pruebas frecuentes: " +
                         ", ".join(f"{t}×{n}" for t, n in c.test_types))
            top_topics = ", ".join(f"{t.topic}" for t in c.topic_suggestions[:4])
            lines.append(f"  Temas sugeridos: {top_topics}")

        lines.append(f"\nProbabilidad de entrar:")
        lines.append(f"  Hoy:                 {self.probability_now.pct()}% "
                     f"(confianza {self.probability_now.confidence})")
        lines.append(f"  Si completas el plan: {self.probability_target.pct()}% "
                     f"(confianza {self.probability_target.confidence})")

        sp = self.study_plan
        lines.append(f"\nPlan de estudio — {sp.total_hours:.0f}h totales:")
        for skill, items in sp.by_skill().items():
            h = sum(i.hours for i in items)
            lines.append(f"  ▸ {skill} ({h:.0f}h) — {items[0].reason}")
            for it in items:
                lines.append(f"      - {it.topic}: {it.hours:.0f}h")

        sc = self.schedule
        lines.append(f"\nAgenda (estilo Runna) — {sc.total_weeks} semanas, "
                     f"~{sc.weekly_hours:.0f}h/semana:")
        for s in sc.sessions:
            topics = ", ".join(f"{i.skill}:{i.topic}" for i in s.items[:3])
            extra = "…" if len(s.items) > 3 else ""
            label = topics + extra if s.items else s.note
            lines.append(f"  Semana {s.week} ({s.start.isoformat()}): {s.hours:.0f}h — {label}")
        lines.append(f"  ★ {sc.milestone()}")

        if self.recommended_models:
            lines.append("\nModelos recomendados en la tienda:")
            for l in self.recommended_models:
                badge = "★ RECOMENDADO" if l.recommended else "usuario"
                lines.append(f"  • {l.model.title} [{badge}] — {l.rating.display}")

        return "\n".join(lines)


def _skill_coverage(profile: RoleProfile, levels: dict[str, float], target: float) -> float:
    """Cobertura ponderada de skills al nivel objetivo (0..1)."""
    total_w = sum(s.weight for s in profile.skills) or 1.0
    covered = 0.0
    for s in profile.skills:
        lvl = levels.get(s.skill, 0.0)
        covered += s.weight * min(lvl / target, 1.0)
    return covered / total_w


def seed_official_models(store: ModelStore) -> ModelStore:
    """Carga modelos oficiales (curados por nuestro análisis) en la tienda."""
    officials = [
        StudyModel(
            "off-backend", "Backend Senior — Ruta Mercurio", "Backend Engineer",
            "Atenea", ["python", "algorithms", "system_design", "sql"],
            total_hours=96, modules_count=16, has_schedule=True, evidence_sources=6,
        ),
        StudyModel(
            "off-pm", "Product Manager — Discovery & Métricas", "Product Manager",
            "Atenea", ["product", "communication", "sql"],
            total_hours=58, modules_count=10, has_schedule=True, evidence_sources=5,
        ),
        StudyModel(
            "off-cloud", "Cloud/DevOps — Ruta Cronos", "Cloud Engineer",
            "Atenea", ["cloud", "system_design", "python"],
            total_hours=78, modules_count=12, has_schedule=True, evidence_sources=4,
        ),
    ]
    for m in officials:
        store.add_official(m)
    # reviews iniciales para que algunos ya sean visibles (>= MIN_VISIBLE)
    for stars in (5, 5, 4, 5, 4, 5):
        store.review("off-backend", stars)
    for stars in (4, 5, 4, 5, 3):
        store.review("off-pm", stars)
    for stars in (5, 4, 4):   # aún en evaluación (< MIN_VISIBLE)
        store.review("off-cloud", stars)
    return store


def run_pipeline(
    posting: str,
    title: str = "",
    company: str | None = None,
    current_levels: dict[str, float] | None = None,
    weekly_hours: float = 10.0,
    target_date: date | None = None,
    experience_years: float = 2.0,
    start_date: date | None = None,
    store: ModelStore | None = None,
) -> CareerPlan:
    current_levels = current_levels or {}

    # 1. skills de la posición
    role = SkillExtractor().extract(posting, title=title)

    # 2. análisis de empresa
    insight = CompanyAnalyzer().analyze(company) if company else None
    company_topics: dict[str, float] = {}
    company_difficulty = 0.5
    if insight:
        company_difficulty = insight.avg_difficulty
        # normaliza los scores de temas a un boost 0..0.5
        max_score = max((t.score for t in insight.topic_suggestions), default=1.0) or 1.0
        company_topics = {
            t.topic: 0.5 * (t.score / max_score) for t in insight.topic_suggestions
        }

    # 3. plan de estudio
    plan = StudyPlanGenerator().generate(role, current_levels, company_topics)

    # 4. agenda hacia la fecha de pruebas
    schedule = Scheduler(weekly_hours=weekly_hours).build(
        plan, start=start_date, test_date=target_date)

    # 5. probabilidad (hoy vs. completando el plan)
    from .study_plan import _TARGET_BY_SENIORITY
    target = _TARGET_BY_SENIORITY.get(role.seniority, 0.8)
    cov_now = _skill_coverage(role, current_levels, target)
    cov_target = _skill_coverage(role, {s.skill: target for s in role.skills}, target)

    model = SuccessModel()
    prob_now = model.predict(cov_now, 0.0, company_difficulty, experience_years)
    prob_target = model.predict(cov_target, 1.0, company_difficulty, experience_years)

    # 6. modelos recomendados de la tienda
    if store is None:
        store = seed_official_models(ModelStore())
    recommended = store.recommended_for(title or role.title, n=4)

    return CareerPlan(
        role=role,
        company=insight,
        study_plan=plan,
        schedule=schedule,
        probability_now=prob_now,
        probability_target=prob_target,
        recommended_models=recommended,
    )
