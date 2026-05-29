# Ideas guardadas (memoria / extra)

> Notas capturadas a petición del usuario. No son parte del producto activo;
> son ideas para retomar más adelante.

## Video documental — "Cómo mantuve el sitio siempre disponible" (2026-05-29)

Idea para un video documental/narrativo sobre el trabajo de mantener el sitio
(Estructuras del Pacífico) siempre arriba, mezclando narrativa personal +
técnica:

- **Estructura tipo documental con saltos temporales:**
  - Mostrar cómo se fue viviendo el proceso (el "presente").
  - Flashbacks ("vuelta al pasado") al plan original y a cómo se ideó para que
    sucediera la alta disponibilidad.
  - Voice over relacionando ese plan mientras se muestra cómo se ejecutó.
  - Volver a mí (cámara/presente) y seguir platicando del plan.
  - Otro salto atrás, y así alternando presente ↔ pasado.
- **Sección técnica del video:** mostrar **cómo calculé el éxito**.
  - Escenarios de tráfico y cuáles serían las **escalas** (cómo escalar según
    la demanda).
  - De ser posible, basado en un **algoritmo que calcule el tráfico a futuro**,
    probablemente entrenado/inspirado en **patrones de sitios o apps con mucho
    éxito** (predicción de crecimiento de tráfico por analogía con curvas de
    adopción conocidas).

**Posible implementación futura del algoritmo de tráfico:**
- Modelar curvas de adopción (p. ej. logística / Bass diffusion) ajustadas a
  series de tráfico de sitios exitosos como referencia.
- Proyectar escenarios (pesimista / base / optimista) y mapear cada escenario a
  un plan de escalado (réplicas, CDN, caching, autoscaling).
- Definir umbrales de tráfico → acción de escala, y visualizarlos para el video.
