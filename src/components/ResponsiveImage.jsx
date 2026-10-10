import { imgUrl, srcSet, WIDTHS } from '../images'

/**
 * <picture> with AVIF → WebP → JPEG sources, each in every width, so the
 * browser downloads only the size the layout needs (see src/images.js).
 *
 * `src` is a public path ("/albums/x/01.jpeg"); `sizes` describes the rendered
 * width. `priority` marks the page's main (LCP) image: eager + high priority.
 */
export default function ResponsiveImage({
  src,
  alt,
  sizes = '100vw',
  widths = WIDTHS,
  priority = false,
  className,
  imgClassName,
  ...rest
}) {
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={srcSet(src, 'avif', widths)} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet(src, 'webp', widths)} sizes={sizes} />
      <img
        src={imgUrl(src, 1200, 'jpeg')}
        srcSet={srcSet(src, 'jpeg', widths)}
        sizes={sizes}
        alt={alt}
        className={imgClassName}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'auto' : 'async'}
        fetchpriority={priority ? 'high' : undefined}
        {...rest}
      />
    </picture>
  )
}
