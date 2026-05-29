"""
Agenda estilo "Runna".
======================

Igual que una app de running planea entrenamientos hacia la fecha de una
carrera, aquí el plan de estudio se distribuye hacia la fecha de las pruebas.

  - Si el usuario da una fecha objetivo, se reparten las horas hacia atrás,
    reservando la última semana para simulacro + repaso (taper).
  - Si no da fecha, se calcula una recomendada según horas totales y capacidad
    semanal disponible.

Produce sesiones semanales con fecha y un hito final: "Día de las pruebas".
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import date, timedelta

from .study_plan import StudyPlan, PlanItem


@dataclass
class Session:
    week: int
    start: date
    end: date
    items: list[PlanItem]
    hours: float
    note: str = ""


@dataclass
class Schedule:
    start_date: date
    test_date: date
    weekly_hours: float
    sessions: list[Session]
    total_weeks: int

    def milestone(self) -> str:
        return f"Día de las pruebas: {self.test_date.isoformat()}"


class Scheduler:
    def __init__(self, weekly_hours: float = 10.0, taper_weeks: int = 1) -> None:
        if weekly_hours <= 0:
            raise ValueError("weekly_hours debe ser > 0")
        self.weekly_hours = weekly_hours
        self.taper_weeks = max(taper_weeks, 0)

    def recommend_test_date(self, plan: StudyPlan, start: date | None = None) -> date:
        start = start or date.today()
        study_weeks = math.ceil(plan.total_hours / self.weekly_hours) if plan.total_hours else 0
        total_weeks = study_weeks + self.taper_weeks
        return start + timedelta(weeks=max(total_weeks, 1))

    def build(self, plan: StudyPlan, start: date | None = None,
              test_date: date | None = None) -> Schedule:
        start = start or date.today()
        if test_date is None:
            test_date = self.recommend_test_date(plan, start)
        if test_date <= start:
            raise ValueError("test_date debe ser posterior a la fecha de inicio")

        total_weeks = max((test_date - start).days // 7, 1)
        study_weeks = max(total_weeks - self.taper_weeks, 1)

        # capacidad por semana ajustada para que TODO entre antes del taper
        per_week = plan.total_hours / study_weeks if study_weeks else plan.total_hours
        per_week = max(per_week, 0.1)

        sessions: list[Session] = []
        queue = list(plan.items)
        idx = 0
        w = 0
        # llena semanas hasta agotar los temas (sin semanas vacías al final)
        while idx < len(queue) and w < study_weeks:
            wk_start = start + timedelta(weeks=w)
            wk_end = wk_start + timedelta(days=6)
            budget = per_week
            chunk: list[PlanItem] = []
            acc = 0.0
            while idx < len(queue) and acc < budget:
                item = queue[idx]
                chunk.append(item)
                acc += item.hours
                idx += 1
            sessions.append(Session(
                week=w + 1, start=wk_start, end=wk_end,
                items=chunk, hours=round(acc, 1),
                note="bloque de estudio",
            ))
            w += 1

        # arrastrar lo que sobró a la última semana de estudio
        if idx < len(queue) and sessions:
            leftover = queue[idx:]
            sessions[-1].items.extend(leftover)
            sessions[-1].hours = round(sessions[-1].hours + sum(i.hours for i in leftover), 1)

        # semanas de taper (simulacro + repaso) justo antes de las pruebas
        weeks_used = len(sessions)
        for t in range(self.taper_weeks):
            wk_start = test_date - timedelta(weeks=self.taper_weeks - t)
            wk_end = wk_start + timedelta(days=6)
            sessions.append(Session(
                week=weeks_used + t + 1, start=wk_start, end=wk_end,
                items=[], hours=round(self.weekly_hours * 0.6, 1),
                note="simulacro de entrevista + repaso (taper)",
            ))

        return Schedule(
            start_date=start,
            test_date=test_date,
            weekly_hours=round(per_week, 1),
            sessions=sessions,
            total_weeks=total_weeks,
        )
