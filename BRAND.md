# Identidad gráfica — Estructuras del Pacífico

Guía de marca aplicada en el sitio. El código la implementa en `src/Brand.jsx`
(componentes `Monogram` y `Logo`), `public/favicon.svg` y las variables CSS de
`src/styles.css`.

## Paleta

| Uso                     | Color   | Variable CSS    |
|-------------------------|---------|-----------------|
| Charcoal (architectural)| `#2C2C2C` | `--ink`       |
| Muted Bronze (accent)   | `#B39B78` | `--bronze`    |
| Bronze profundo         | `#8E7958` | `--bronze-deep` |
| Light Greige (base/fondo)| `#F4F3F0` | `--bg`       |

> **Sin amarillos brillantes.** El bronce es apagado y cálido, nunca dorado saturado.

## Tipografía

- **Montserrat** — logotipos y títulos (`--display`). Pesos 200–500.
- **Lora** — cuerpos de texto (`--serif`). "Maestría en madera y palapas
  monumentales. Lectura elegante y fluida."

## Símbolo

Monograma de **cabriada de madera** (king-post truss): pares con alero, tirante,
pendolón, jabalcones y postes verticales. Trazo en bronce sobre charcoal o greige.
Es la variante `trussed` en `Monogram` (oficial).

## Lockup

`Logo` combina el monograma con el wordmark "ESTRUCTURAS DEL PACÍFICO" (Montserrat).
Bajada de marca: **High-end tropical palapas & master woodcraft**.

- `layout="row"` — horizontal (header).
- `layout="stack"` — apilado y centrado (cierres, portadas).

## Texturas de referencia

Madera noble (parota) y concreto pulido — para fotografía y materiales, no para UI.
