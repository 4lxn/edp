/**
 * Responsive image variants — single source of truth shared by the build
 * script (scripts/responsive-images.mjs) and the <Picture> component.
 * A variant is never wider than the source, so nothing is ever upscaled.
 */
export const STEPS = [640, 960, 1440, 1920, 2560]

/** Widths generated for a source of width `w` (always ends at min(w, 2560)). */
export function variantWidths(w) {
  const top = Math.min(w, STEPS[STEPS.length - 1])
  const ws = STEPS.filter((s) => s < top * 0.9)
  ws.push(top)
  return ws
}

/** '/albums/x/01.jpeg' + 960 + 'avif' → '/r/albums/x/01-960.avif' */
export function variantUrl(src, width, ext) {
  return '/r' + src.replace(/\.[^./]+$/, '') + `-${width}.${ext}`
}
