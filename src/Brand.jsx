/**
 * Brand — the king-post truss monogram (see BRAND.md).
 * Rafters with eaves, tie beam, king post, struts and posts.
 */
export function Monogram({ size = 24, color = 'currentColor', strokeWidth = 1.4 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false"
    >
      <path d="M3 28 L20 4 L37 28" />
      <path d="M7 24 L33 24" />
      <path d="M20 4 L20 24" />
      <path d="M20 24 L11.5 16" />
      <path d="M20 24 L28.5 16" />
      <path d="M7 24 L7 34" />
      <path d="M33 24 L33 34" />
    </svg>
  )
}
