# Atenea — "Runna" para entrar a empresas

Sistema **end-to-end** que, dada una posición de trabajo, detecta las skills que
pide, analiza la empresa, calcula tu probabilidad de entrar, te arma un plan de
estudio personalizado y lo agenda hacia la **fecha de las pruebas** (igual que
Runna planea entrenamientos hacia la fecha de una carrera).

Todo en **Python puro** (librería estándar). Sin dependencias externas.

```bash
python -m atenea                       # demo con la posición de ejemplo
python -m atenea --company Helios --title "Product Manager"
python -m atenea --posting-file mi_vacante.txt --weekly-hours 8
```

## El pipeline

```
posición ─► skills detectadas ─► análisis de empresa ─► modelo de probabilidad
         ─► plan de estudio ─► agenda hacia la fecha de pruebas ─► tienda de modelos
```

| # | Módulo | Qué hace |
|---|--------|----------|
| 1 | `skills.py` + `taxonomy.py` | Detecta skills de la vacante, distingue *requeridas* vs *deseables*, infiere seniority y lo que la posición busca en específico. |
| 2 | `company.py` | Agrega reviews de quienes **entraron vs. los que no**: tasa de aceptación, tipos de prueba, dificultad y **temas sugeridos**. |
| 3 | `probability.py` | Regresión logística entrenada sobre **todos los casos de usuario** → P(entrar) hoy vs. completando el plan. |
| 4 | `study_plan.py` | Plan personalizado por skill: escala horas según tu nivel actual y prioriza lo requerido + lo que pregunta la empresa. Respeta prerequisitos. |
| 5 | `scheduler.py` | Reparte el plan en semanas hacia la **fecha de las pruebas**, con *taper* final (simulacro + repaso). Calcula la fecha si no la das. |
| 6 | `reviews.py` | Puntuación de modelos. Las reviews **no se muestran hasta tener un número considerable** (`MIN_VISIBLE`); el ranking usa promedio bayesiano (justo con pocos votos), así la nota **sube con la evidencia**. |
| 7 | `store.py` | Tienda con **modelos recomendados por nuestro análisis** (oficiales, con boost) + **modelos de usuarios**. Ordena recomendados arriba y por estrellas. |
| 8 | `committee.py` | Los modelos de usuarios se **pre-aprueban por un comité de filósofos griegos** (Sócrates, Platón, Aristóteles, Epicuro, Diógenes, Pitágoras, Heráclito), cada uno con un punto de vista distinto. Gana la **mayoría (democracia)**. |
| 9 | `interest_graph.py` | Grafo de intereses usuario↔skill. Agrupa **tipos de usuario** y destila el **modelo más refinado** para cada tipo. |
| — | `pipeline.py` | Orquesta todo en un `CareerPlan` con reporte legible. |

## El comité de filósofos (democracia)

Cada filósofo evalúa un modelo de usuario desde su escuela:

| Filósofo | Escuela | Prioriza |
|----------|---------|----------|
| Sócrates | Mayéutica | rigor / profundidad |
| Platón | Academia | coherencia con la forma ideal del rol |
| Aristóteles | Liceo | evidencia empírica |
| Epicuro | Jardín | sostenibilidad (evitar burnout) |
| Diógenes | Cinismo | practicidad, sin relleno |
| Pitágoras | Pitagóricos | estructura y orden |
| Heráclito | Flujo | adaptabilidad al calendario |

Un modelo se publica solo si la **mayoría** vota a favor (empate = rechazado).

## Uso como librería

```python
from datetime import date
from atenea import run_pipeline

plan = run_pipeline(
    posting=open("vacante.txt").read(),
    title="Senior Backend Engineer",
    company="Mercurio",
    current_levels={"python": 0.6, "sql": 0.5, "algorithms": 0.3},
    weekly_hours=10,
    experience_years=3,
)
print(plan.render())
print("Probabilidad hoy:", plan.probability_now.pct(), "%")
print("Si completas el plan:", plan.probability_target.pct(), "%")
```

## Tests

```bash
pytest atenea/tests/ -q      # 24 tests
```

## Roadmap

- Persistencia real (DB) para empresas, reviews y modelos.
- Embeddings para detección de skills más allá de los alias.
- Calibración del modelo de probabilidad con validación cruzada.
- Feedback loop: el resultado real (entró / no entró) re-alimenta el modelo.
