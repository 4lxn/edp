"""
Demo end-to-end de Atenea.
==========================

    python -m atenea            # corre la demo con la posición de ejemplo
    python -m atenea --help     # opciones

Muestra el pipeline completo + el comité de filósofos aprobando un modelo de
usuario + el grafo de intereses con el modelo refinado por tipo de usuario.
"""

from __future__ import annotations

import argparse
import sys
from datetime import date

from .data import SAMPLE_POSTING
from .pipeline import run_pipeline, seed_official_models
from .store import ModelStore, StudyModel
from .interest_graph import InterestGraph, UserProfile


def _demo_committee_and_store(store: ModelStore) -> None:
    print("\n" + "=" * 64)
    print("COMITÉ DE FILÓSOFOS — pre-aprobación de modelos de usuario")
    print("=" * 64)

    # Un buen modelo de usuario (debería pasar)
    good = StudyModel(
        "usr-001", "Mi ruta Backend en 8 semanas", "Backend Engineer",
        "alan", ["python", "algorithms", "system_design"],
        total_hours=90, modules_count=12, has_schedule=True, evidence_sources=4,
    )
    # Un modelo flojo (debería ser rechazado)
    weak = StudyModel(
        "usr-002", "Crack en 1 finde", "Backend Engineer",
        "anon", ["python", "algorithms", "system_design", "cloud", "react",
                 "machine_learning", "product"],
        total_hours=10, modules_count=3, has_schedule=False, evidence_sources=0,
    )

    for m in (good, weak):
        approved, verdict = store.submit_user_model(m)
        print(f"\n▸ \"{m.title}\" por {m.author}")
        print(f"  {verdict.summary()}")
        for v in verdict.votes:
            mark = "✓" if v.approve else "✗"
            print(f"    {mark} {v.philosopher} ({v.school}): {v.reason}")


def _demo_store(store: ModelStore) -> None:
    print("\n" + "=" * 64)
    print("TIENDA — Backend Engineer")
    print("=" * 64)
    for l in store.listing("Backend Engineer"):
        badge = "★ RECOMENDADO" if l.recommended else "usuario"
        print(f"  {l.rating.display:<34} {l.model.title} [{badge}]")


def _demo_interest_graph() -> None:
    print("\n" + "=" * 64)
    print("GRAFO DE INTERESES — modelo refinado por tipo de usuario")
    print("=" * 64)
    g = InterestGraph()
    g.add_user(UserProfile("alan", {"python": 0.9, "algorithms": 0.8, "system_design": 0.7},
                           {"python": 30, "algorithms": 40}))
    g.add_user(UserProfile("bea", {"python": 0.8, "algorithms": 0.9, "sql": 0.5},
                           {"python": 28, "algorithms": 44}))
    g.add_user(UserProfile("caro", {"product": 0.9, "communication": 0.8, "sql": 0.6}))
    g.add_user(UserProfile("dani", {"product": 0.85, "communication": 0.7, "sql": 0.5}))
    g.add_user(UserProfile("edu", {"cloud": 0.9, "system_design": 0.8, "python": 0.6}))

    for rm in g.refined_models():
        skills = ", ".join(f"{s}({w:.0%})" for s, w in rm.top_skills)
        print(f"\n  {rm.user_type}  ·  miembros: {', '.join(rm.members)}")
        print(f"    skills clave: {skills}")
        if rm.avg_hours:
            print(f"    horas promedio: {rm.avg_hours}")
    print("\n  Skills relacionadas con 'python':",
          ", ".join(f"{s}({w:.2f})" for s, w in g.related_skills("python")))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Atenea — Runna para entrar a empresas")
    ap.add_argument("--company", default="Mercurio", help="empresa a analizar")
    ap.add_argument("--title", default="Senior Backend Engineer", help="título del puesto")
    ap.add_argument("--weekly-hours", type=float, default=10.0)
    ap.add_argument("--experience", type=float, default=3.0, help="años de experiencia")
    ap.add_argument("--posting-file", help="archivo con el texto de la posición")
    args = ap.parse_args(argv)

    posting = SAMPLE_POSTING
    if args.posting_file:
        with open(args.posting_file, encoding="utf-8") as fh:
            posting = fh.read()

    # nivel actual del usuario (ejemplo): sabe algo de python/sql, poco lo demás
    current_levels = {"python": 0.6, "sql": 0.5, "algorithms": 0.3, "communication": 0.4}

    plan = run_pipeline(
        posting=posting,
        title=args.title,
        company=args.company,
        current_levels=current_levels,
        weekly_hours=args.weekly_hours,
        experience_years=args.experience,
        start_date=date(2026, 6, 1),
    )
    print(plan.render())

    store = seed_official_models(ModelStore())
    _demo_committee_and_store(store)
    _demo_store(store)
    _demo_interest_graph()
    return 0


if __name__ == "__main__":
    sys.exit(main())
