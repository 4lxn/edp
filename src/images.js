/**
 * Responsive image URLs — shared by the React components, the SEO head and
 * the image server (server/images.mjs), so the allowed sizes live in one place.
 *
 * URL shape: /_img/<width|og>/<avif|webp|jpeg>/<path under public/>
 *   e.g. /_img/800/avif/albums/punta-garrobo/07.jpeg
 * The server resizes + re-encodes on first request and caches the result.
 */
export const IMG_PREFIX = '/_img/'
export const WIDTHS = [400, 800, 1200, 1600, 2400]
export const FORMATS = ['avif', 'webp', 'jpeg']

// Each path segment URL-encoded, so a photo named "IMG 1.jpg" can't break a srcset.
const clean = (src) => String(src).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')

/** URL of one variant. `size` is a width from WIDTHS, or 'og' (1200×630 crop). */
export const imgUrl = (src, size, format = 'jpeg') => `${IMG_PREFIX}${size}/${format}/${clean(src)}`

/** srcset string for one format across the given widths. */
export const srcSet = (src, format, widths = WIDTHS) =>
  widths.map((w) => `${imgUrl(src, w, format)} ${w}w`).join(', ')
