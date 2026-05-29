"""
Plan de estudio personalizado.
==============================

Combina:
  - el `RoleProfile` (skills de la posición y su peso)
  - el nivel actual del usuario por skill (0..1)
  - los temas (`Module`) de la taxonomía
  - los temas sugeridos por el análisis de la empresa (boost)

y produce un plan ordenado por prioridad, respetando prerequisitos dentro de
cada skill. Las horas de cada tema se escalan por la brecha del usuario
(target - nivel_actual): si ya dominas algo, se estudia menos.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from . import taxonomy
from .skills import RoleProfile


@dataclass
class PlanItem:
    skill: str
    topic: str
    hours: float
    priority: float
    reason: str


@dataclass
class StudyPlan:
    role_title: str
    items: list[PlanItem]
    total_hours: float

    def by_skill(self) -> dict[str, list[PlanItem]]:
        out: dict[str, list[PlanItem]] = {}
        for it in self.items:
            out.setdefault(it.skill, []).append(it)
        return out


# Target de dominio por seniority (qué tan alto hay que llegar)
_TARGET_BY_SENIORITY = {"junior": 0.6, "mid": 0.8, "senior": 0.95}


class StudyPlanGenerator:
    def generate(
        self,
        profile: RoleProfile,
        current_levels: dict[str, float] | None = None,
        company_topics: dict[str, float] | None = None,
    ) -> StudyPlan:
        current_levels = current_levels or {}
        company_topics = company_topics or {}
        target = _TARGET_BY_SENIORITY.get(profile.seniority, 0.8)

        items: list[PlanItem] = []
        for det in profile.skills:
            skill = det.skill
            sk = taxonomy.SKILLS.get(skill)
            if not sk:
                continue
            level = current_levels.get(skill, 0.0)
            gap = max(target - level, 0.0)
            if gap <= 0:
                continue  # ya lo domina al nivel pedido

            # boost si la empresa lo menciona como tema clave
            company_boost = 1.0 + company_topics.get(skill, 0.0)
            base_priority = det.weight * (1.3 if det.required else 1.0) * company_boost

            for mod in self._ordered_modules(sk):
                hours = round(mod.hours * gap, 1)
                if hours <= 0:
                    continue
                reason = self._reason(det, gap, skill in company_topics)
                items.append(PlanItem(
                    skill=skill,
                    topic=mod.topic,
                    hours=hours,
                    priority=round(base_priority, 4),
                    reason=reason,
                ))

        # ordenar por prioridad de skill, manteniendo el orden de prereqs intacto
        items = self._stable_priority_sort(items)
        total = round(sum(i.hours for i in items), 1)
        return StudyPlan(role_title=profile.title, items=items, total_hours=total)

    @staticmethod
    def _ordered_modules(skill: taxonomy.Skill) -> list[taxonomy.Module]:
        """Topo-sort de módulos según prereqs (dentro de la skill)."""
        by_topic = {m.topic: m for m in skill.modules}
        visited: set[str] = set()
        order: list[taxonomy.Module] = []

        def visit(m: taxonomy.Module) -> None:
            if m.topic in visited:
                return
            for p in m.prereqs:
                if p in by_topic:
                    visit(by_topic[p])
            visited.add(m.topic)
            order.append(m)

        for m in skill.modules:
            visit(m)
        return order

    @staticmethod
    def _reason(det, gap: float, from_company: bool) -> str:
        bits = []
        if det.required:
            bits.append("requerida por la posición")
        else:
            bits.append("deseable")
        if from_company:
            bits.append("preguntada por la empresa")
        if gap > 0.6:
            bits.append("brecha alta")
        return ", ".join(bits)

    @staticmethod
    def _stable_priority_sort(items: list[PlanItem]) -> list[PlanItem]:
        # agrupa por skill conservando el orden de módulos; ordena grupos por prioridad
        groups: dict[str, list[PlanItem]] = {}
        order_seen: list[str] = []
        for it in items:
            if it.skill not in groups:
                groups[it.skill] = []
                order_seen.append(it.skill)
            groups[it.skill].append(it)
        ranked = sorted(order_seen, key=lambda s: -groups[s][0].priority)
        out: list[PlanItem] = []
        for s in ranked:
            out.extend(groups[s])
        return out
