/**
 * Brand — identidad gráfica de Estructuras del Pacífico.
 *
 * Sigue la guía de marca:
 *   Paleta  · Charcoal #2C2C2C · Bronce #B39B78 · Greige #F4F3F0 (sin amarillos)
 *   Tipos   · Montserrat (logotipos/títulos) · Lora (cuerpos de texto)
 *   Símbolo · cabriada de madera (king-post truss): pendolón, pares y postes.
 *
 * `trussed` es el monograma oficial. `diamond` y `edp` quedan como alternativas
 * para el panel de tweaks.
 */

export function Monogram({ kind = 'trussed', size = 28, color = 'currentColor', strokeWidth = 1.3 }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 40 40',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  if (kind === 'diamond') {
    return (
      <svg {...common}>
        <path d="M20 4 L36 20 L20 36 L4 20 Z" />
        <path d="M20 4 L20 36" />
        <path d="M4 20 L36 20" />
      </svg>
    )
  }

  if (kind === 'edp') {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="32" height="32" />
        <path d="M14 28 L14 12 L20 12" />
        <path d="M14 20 L19 20" />
        <path d="M22 28 L22 12 L28 12 L28 18 L22 18" />
      </svg>
    )
  }

  // trussed (oficial) — cabriada king-post: pares con alero, tirante,
  // pendolón, jabalcones y postes verticales.
  return (
    <svg {...common}>
      {/* pares (rafters) con alero */}
      <path d="M3 28 L20 4 L37 28" />
      {/* tirante (tie beam) */}
      <path d="M7 24 L33 24" />
      {/* pendolón (king post) */}
      <path d="M20 4 L20 24" />
      {/* jabalcones (queen struts) */}
      <path d="M20 24 L11.5 16" />
      <path d="M20 24 L28.5 16" />
      {/* postes verticales */}
      <path d="M7 24 L7 34" />
      <path d="M33 24 L33 34" />
    </svg>
  )
}

/**
 * Logo — lockup de marca: monograma + wordmark.
 * layout="row" (horizontal) | "stack" (apilado, centrado).
 */
export function Logo({
  kind = 'trussed',
  size = 30,
  layout = 'row',
  color = 'var(--ink)',
  accent = 'var(--bronze)',
  tagline = false,
}) {
  const stack = layout === 'stack'
  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: stack ? 'column' : 'row',
        alignItems: 'center',
        gap: stack ? 10 : 14,
        color,
      }}
    >
      <Monogram kind={kind} size={stack ? size * 2 : size} color={accent} />
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: stack ? 'center' : 'flex-start' }}>
        <span
          style={{
            fontFamily: 'var(--display)',
            fontWeight: 500,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontSize: stack ? 18 : 14,
            lineHeight: 1.1,
          }}
        >
          Estructuras del Pacífico
        </span>
        {tagline && (
          <span
            style={{
              fontFamily: 'var(--display)',
              fontWeight: 400,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              fontSize: 9,
              color: 'var(--ink-soft)',
              marginTop: 4,
            }}
          >
            High-end tropical palapas &amp; master woodcraft
          </span>
        )}
      </span>
    </span>
  )
}
