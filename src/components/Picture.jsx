import { variantWidths, variantUrl } from '../imgsizes'

/**
 * A real <img> inside <picture>: AVIF + JPEG srcset, width/height, lazy by
 * default. `ratio` crops with object-fit: cover inside a fixed frame.
 *
 * Never upscales: the frame is capped (max-width) at the pixels the source can
 * actually fill for that crop, so a small photo stays sharp instead of soft.
 * Pass `cap={false}` only for full-bleed frames whose source is large enough.
 */
export default function Picture({
  img, alt = '', ratio, sizes = '100vw', eager = false, className = '', focus, cap = true, style,
}) {
  if (!img) return null
  const r = ratio || img.w / img.h
  const maxW = Math.round(Math.min(img.w, img.h * r))
  const ws = variantWidths(img.w)
  const set = (ext) => ws.map((w) => `${variantUrl(img.src, w, ext)} ${w}w`).join(', ')
  // Dev serves the original file so photos added from the admin show at once;
  // the build serves the generated variants (scripts/responsive-images.mjs).
  const dev = import.meta.env.DEV
  const fallback = dev ? img.src : variantUrl(img.src, ws.filter((w) => w <= 1440).pop() || ws[0], 'jpg')
  const pos = focus || img.focus

  return (
    <picture
      className={'pic ' + className}
      style={{ aspectRatio: String(r), ...(cap ? { maxWidth: maxW } : null), ...style }}
    >
      {!dev && <source type="image/avif" srcSet={set('avif')} sizes={sizes} />}
      <img
        src={fallback}
        srcSet={dev ? undefined : set('jpg')}
        sizes={dev ? undefined : sizes}
        width={maxW}
        height={Math.round(maxW / r)}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        fetchpriority={eager ? 'high' : undefined}
        decoding={eager ? 'sync' : 'async'}
        style={pos ? { objectPosition: pos } : undefined}
      />
    </picture>
  )
}
