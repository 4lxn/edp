"""
Grafo de intereses y modelo refinado por tipo de usuario.
=========================================================

"Ya que tenemos data y los modelos de los usuarios (personalizados) tendremos
ese grafo de intereses, y tendremos el modelo más refinado para cada tipo de
usuario."

Construye un grafo bipartito usuario↔skill (con pesos = interés/peso de la skill
en sus modelos). De ahí:
  - co-ocurrencia skill↔skill (qué skills van juntas)
  - "tipos de usuario" = clusters de usuarios que comparten skills (componentes
    conexas sobre un umbral de similitud Jaccard)
  - por cada tipo, el "modelo refinado" = las skills más valiosas y el promedio
    de horas, destilado de los usuarios de ese cluster.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class UserProfile:
    user_id: str
    # skill -> interés (0..1), típicamente el peso en sus planes/modelos
    interests: dict[str, float]
    hours: dict[str, float] = field(default_factory=dict)


@dataclass
class RefinedModel:
    user_type: str
    members: list[str]
    top_skills: list[tuple[str, float]]   # skill, interés agregado
    avg_hours: dict[str, float]

    def skill_names(self) -> list[str]:
        return [s for s, _ in self.top_skills]


class InterestGraph:
    def __init__(self) -> None:
        self.users: dict[str, UserProfile] = {}
        # adyacencia skill->{skill->peso co-ocurrencia}
        self.skill_edges: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))

    def add_user(self, profile: UserProfile) -> None:
        self.users[profile.user_id] = profile
        skills = list(profile.interests)
        for i, a in enumerate(skills):
            for b in skills[i + 1:]:
                w = (profile.interests[a] + profile.interests[b]) / 2
                self.skill_edges[a][b] += w
                self.skill_edges[b][a] += w

    def related_skills(self, skill: str, n: int = 3) -> list[tuple[str, float]]:
        edges = self.skill_edges.get(skill, {})
        return sorted(edges.items(), key=lambda kv: -kv[1])[:n]

    # ── clustering de tipos de usuario ────────────────────────────────────────

    @staticmethod
    def _jaccard(a: set[str], b: set[str]) -> float:
        if not a or not b:
            return 0.0
        return len(a & b) / len(a | b)

    def user_types(self, threshold: float = 0.34) -> list[list[str]]:
        """Agrupa usuarios por similitud de skills (union-find sobre Jaccard)."""
        ids = list(self.users)
        parent = {u: u for u in ids}

        def find(x: str) -> str:
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        def union(x: str, y: str) -> None:
            parent[find(x)] = find(y)

        for i, u in enumerate(ids):
            su = set(self.users[u].interests)
            for v in ids[i + 1:]:
                sv = set(self.users[v].interests)
                if self._jaccard(su, sv) >= threshold:
                    union(u, v)

        clusters: dict[str, list[str]] = defaultdict(list)
        for u in ids:
            clusters[find(u)].append(u)
        return sorted(clusters.values(), key=len, reverse=True)

    def refined_models(self, threshold: float = 0.34) -> list[RefinedModel]:
        """Destila el modelo más refinado por cada tipo de usuario."""
        out: list[RefinedModel] = []
        for n, cluster in enumerate(self.user_types(threshold), 1):
            agg_interest: dict[str, float] = defaultdict(float)
            agg_hours: dict[str, list[float]] = defaultdict(list)
            for uid in cluster:
                prof = self.users[uid]
                for sk, val in prof.interests.items():
                    agg_interest[sk] += val
                for sk, h in prof.hours.items():
                    agg_hours[sk].append(h)
            # interés promedio del tipo (0..1), no suma cruda
            members = max(len(cluster), 1)
            agg_interest = {sk: val / members for sk, val in agg_interest.items()}
            top = sorted(agg_interest.items(), key=lambda kv: -kv[1])
            avg_hours = {sk: round(sum(v) / len(v), 1) for sk, v in agg_hours.items()}
            label = self._label(top)
            out.append(RefinedModel(
                user_type=f"Tipo {n}: {label}",
                members=cluster,
                top_skills=[(s, round(w, 3)) for s, w in top[:5]],
                avg_hours=avg_hours,
            ))
        return out

    @staticmethod
    def _label(top: list[tuple[str, float]]) -> str:
        if not top:
            return "general"
        return " + ".join(s for s, _ in top[:2])
