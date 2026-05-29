"""Tests del sistema Atenea (end-to-end y por módulo)."""

from __future__ import annotations

from datetime import date

import pytest

from atenea import run_pipeline
from atenea.skills import SkillExtractor
from atenea.company import CompanyAnalyzer
from atenea.study_plan import StudyPlanGenerator
from atenea.scheduler import Scheduler
from atenea.probability import SuccessModel
from atenea.reviews import ReviewLedger, MIN_VISIBLE
from atenea.committee import Committee
from atenea.store import ModelStore, StudyModel
from atenea.interest_graph import InterestGraph, UserProfile
from atenea.pipeline import seed_official_models
from atenea.data import SAMPLE_POSTING


# ─── Skills ───────────────────────────────────────────────────────────────────

def test_extractor_detecta_skills_y_seniority():
    profile = SkillExtractor().extract(SAMPLE_POSTING, title="Senior Backend Engineer")
    names = profile.skill_names()
    assert "python" in names
    assert "system_design" in names
    assert "algorithms" in names
    assert profile.seniority == "senior"


def test_extractor_required_vs_nice():
    profile = SkillExtractor().extract(SAMPLE_POSTING)
    by = {s.skill: s for s in profile.skills}
    assert by["python"].required is True
    # ML/cloud están en "nice to have"
    assert by["machine_learning"].required is False


def test_pesos_suman_uno():
    profile = SkillExtractor().extract(SAMPLE_POSTING)
    assert abs(sum(s.weight for s in profile.skills) - 1.0) < 1e-6


# ─── Empresa ──────────────────────────────────────────────────────────────────

def test_company_insight_y_sugerencias():
    insight = CompanyAnalyzer().analyze("Mercurio")
    assert insight is not None
    assert 0 <= insight.acceptance_rate <= 1
    assert insight.acceptance_rate == 0.5
    assert insight.topic_suggestions  # hay sugerencias
    assert insight.topic_suggestions[0].score >= insight.topic_suggestions[-1].score


def test_company_inexistente():
    assert CompanyAnalyzer().analyze("NoExiste") is None


# ─── Plan de estudio ──────────────────────────────────────────────────────────

def test_plan_respeta_prereqs():
    profile = SkillExtractor().extract(SAMPLE_POSTING, title="Senior Backend")
    plan = StudyPlanGenerator().generate(profile, {"python": 0.5})
    algos = [i.topic for i in plan.items if i.skill == "algorithms"]
    assert algos.index("Complejidad (Big-O)") < algos.index("Árboles y grafos")
    assert plan.total_hours > 0


def test_plan_reduce_horas_si_ya_domina():
    profile = SkillExtractor().extract(SAMPLE_POSTING)
    bajo = StudyPlanGenerator().generate(profile, {})
    alto = StudyPlanGenerator().generate(profile, {s.skill: 0.95 for s in profile.skills})
    assert alto.total_hours < bajo.total_hours


# ─── Scheduler ────────────────────────────────────────────────────────────────

def test_schedule_termina_antes_de_pruebas():
    profile = SkillExtractor().extract(SAMPLE_POSTING)
    plan = StudyPlanGenerator().generate(profile, {})
    sched = Scheduler(weekly_hours=10).build(plan, start=date(2026, 6, 1))
    assert sched.test_date > sched.start_date
    for s in sched.sessions:
        assert s.start <= sched.test_date
    # última sesión es el taper
    assert "taper" in sched.sessions[-1].note


def test_schedule_sin_semanas_vacias_de_estudio():
    profile = SkillExtractor().extract(SAMPLE_POSTING)
    plan = StudyPlanGenerator().generate(profile, {})
    sched = Scheduler(weekly_hours=10).build(plan, start=date(2026, 6, 1))
    study = [s for s in sched.sessions if "taper" not in s.note]
    assert all(s.items for s in study)  # ninguna semana de estudio vacía


def test_scheduler_rechaza_fecha_invalida():
    profile = SkillExtractor().extract(SAMPLE_POSTING)
    plan = StudyPlanGenerator().generate(profile, {})
    with pytest.raises(ValueError):
        Scheduler().build(plan, start=date(2026, 6, 1), test_date=date(2026, 5, 1))


# ─── Probabilidad ─────────────────────────────────────────────────────────────

def test_modelo_aprende_la_senal():
    model = SuccessModel()
    assert model.accuracy() >= 0.8
    alto = model.predict(0.9, 0.9, 0.5, 5).probability
    bajo = model.predict(0.4, 0.3, 0.9, 0).probability
    assert alto > bajo
    assert 0 <= alto <= 1 and 0 <= bajo <= 1


def test_probabilidad_no_satura():
    model = SuccessModel()
    p = model.predict(0.95, 1.0, 0.5, 6).probability
    assert p < 1.0  # la regularización evita el 100% exacto


# ─── Reviews ──────────────────────────────────────────────────────────────────

def test_reviews_ocultas_hasta_umbral():
    led = ReviewLedger()
    for _ in range(MIN_VISIBLE - 1):
        led.add(5)
    assert led.view().visible is False
    led.add(5)
    assert led.view().visible is True


def test_bayesian_sube_con_evidencia():
    pocas = ReviewLedger()
    pocas.add(5)
    muchas = ReviewLedger()
    for _ in range(20):
        muchas.add(5)
    assert muchas.bayesian_score() > pocas.bayesian_score()


def test_review_invalida():
    with pytest.raises(ValueError):
        ReviewLedger().add(6)


# ─── Comité ───────────────────────────────────────────────────────────────────

def _good_model():
    return StudyModel("g", "Buena ruta", "Backend Engineer", "alan",
                      ["python", "algorithms", "system_design"],
                      total_hours=90, modules_count=12, has_schedule=True,
                      evidence_sources=4)


def _weak_model():
    return StudyModel("w", "Crack en 1 finde", "Backend Engineer", "anon",
                      ["python", "algorithms", "system_design", "cloud", "react",
                       "machine_learning", "product"],
                      total_hours=10, modules_count=3, has_schedule=False,
                      evidence_sources=0)


def test_comite_aprueba_bueno_rechaza_malo():
    com = Committee()
    assert com.deliberate(_good_model()).approved is True
    assert com.deliberate(_weak_model()).approved is False


def test_comite_es_democratico():
    verdict = Committee().deliberate(_good_model())
    favor, contra = verdict.tally
    assert favor + contra == len(verdict.votes)
    assert verdict.approved == (favor > contra)


# ─── Tienda ───────────────────────────────────────────────────────────────────

def test_store_gate_del_comite():
    store = ModelStore()
    ok, _ = store.submit_user_model(_good_model())
    bad, _ = store.submit_user_model(_weak_model())
    assert ok is True and bad is False
    assert store.get("g") is not None
    assert store.get("w") is None
    assert store.rejection_of("w") is not None


def test_store_recomendados_primero():
    store = seed_official_models(ModelStore())
    store.submit_user_model(_good_model())
    listing = store.listing("Backend Engineer")
    assert listing[0].recommended is True  # oficial arriba


def test_store_ordena_por_puntuacion():
    store = ModelStore()
    a = StudyModel("a", "A", "Backend Engineer", "x", ["python"], 40, 5, True, 5)
    b = StudyModel("b", "B", "Backend Engineer", "y", ["python"], 40, 5, True, 5)
    store.add_official(a)
    store.add_official(b)
    for _ in range(6):
        store.review("a", 5)
    for _ in range(6):
        store.review("b", 2)
    listing = store.listing("Backend Engineer")
    assert listing[0].model.model_id == "a"


# ─── Grafo de intereses ───────────────────────────────────────────────────────

def test_grafo_clusteriza_tipos():
    g = InterestGraph()
    g.add_user(UserProfile("a", {"python": 0.9, "algorithms": 0.8}))
    g.add_user(UserProfile("b", {"python": 0.8, "algorithms": 0.9}))
    g.add_user(UserProfile("c", {"product": 0.9, "communication": 0.8}))
    g.add_user(UserProfile("d", {"product": 0.85, "communication": 0.7}))
    types = g.user_types()
    assert len(types) == 2
    refined = g.refined_models()
    assert all(0 <= w <= 1 for rm in refined for _, w in rm.top_skills)


def test_grafo_skills_relacionadas():
    g = InterestGraph()
    g.add_user(UserProfile("a", {"python": 0.9, "algorithms": 0.8, "system_design": 0.7}))
    rel = dict(g.related_skills("python"))
    assert "algorithms" in rel


# ─── End-to-end ───────────────────────────────────────────────────────────────

def test_pipeline_end_to_end():
    plan = run_pipeline(
        posting=SAMPLE_POSTING,
        title="Senior Backend Engineer",
        company="Mercurio",
        current_levels={"python": 0.6, "sql": 0.5},
        weekly_hours=10,
        experience_years=3,
        start_date=date(2026, 6, 1),
    )
    assert plan.role.seniority == "senior"
    assert plan.company is not None
    assert plan.study_plan.total_hours > 0
    assert plan.schedule.test_date > plan.schedule.start_date
    # completar el plan mejora la probabilidad
    assert plan.probability_target.probability > plan.probability_now.probability
    assert plan.recommended_models  # hay recomendaciones
    assert "PLAN PARA" in plan.render()


def test_pipeline_sin_empresa():
    plan = run_pipeline(posting=SAMPLE_POSTING, title="Backend", start_date=date(2026, 6, 1))
    assert plan.company is None
    assert plan.study_plan.total_hours > 0
