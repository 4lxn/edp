"""
Atenea — "Runna" para entrar a empresas.
=========================================

Pipeline end-to-end que, dada una posición de trabajo:

  1. Detecta las skills y lo que la posición busca en específico   (skills.py)
  2. Analiza la empresa: reviews de quienes entraron vs. los que no (company.py)
  3. Construye un modelo de probabilidad de éxito sobre casos reales (probability.py)
  4. Elabora un plan de estudio personalizado                       (study_plan.py)
  5. Agenda fechas y la fecha para presentar las pruebas (estilo    (scheduler.py)
     Runna: plan que apunta a un evento)
  6. Recomienda modelos de la tienda (los nuestros + de usuarios)   (store.py)
  7. Construye un grafo de intereses y el modelo más refinado por   (interest_graph.py)
     tipo de usuario
  8. Aprueba modelos de usuarios vía un comité de filósofos griegos (committee.py)
     por votación democrática.

Todo el paquete usa solo la librería estándar de Python.
"""

from .pipeline import run_pipeline, CareerPlan

__all__ = ["run_pipeline", "CareerPlan"]
__version__ = "0.1.0"
