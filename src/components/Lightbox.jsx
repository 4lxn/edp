import { useCallback, useEffect, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { copy } from '../i18n'
import { useFocusTrap, useScrollLock } from '../hooks'
import ResponsiveImage from './ResponsiveImage'

/**
 * Animated fullscreen image viewer.
 * Controlled via `index` (number = open at that image, null = closed) + `setIndex`.
 * Esc closes; ←/→ navigate; clicking the backdrop closes. Focus stays inside
 * while open and returns to the thumbnail that opened it.
 */
export default function Lightbox({ images, index, setIndex, lang }) {
  const t = copy(lang).lightbox
  const open = index != null
  const ref = useRef(null)
  const close = useCallback(() => setIndex(null), [setIndex])
  const prev = () => setIndex((i) => (i + images.length - 1) % images.length)
  const next = () => setIndex((i) => (i + 1) % images.length)

  useScrollLock(open)
  useFocusTrap(ref, open, close)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') setIndex((i) => (i + images.length - 1) % images.length)
      else if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, images.length, setIndex])

  const img = open ? images[index] : null

  return (
    <AnimatePresence>
      {open && (
        <m.div
          ref={ref}
          className="lb"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={t.label}
        >
          <button type="button" className="lb-close" onClick={close} aria-label={t.close}>✕</button>
          {images.length > 1 && (
            <button type="button" className="lb-nav lb-prev" aria-label={t.prev}
                    onClick={(e) => { e.stopPropagation(); prev() }}>‹</button>
          )}
          <m.figure
            className="lb-fig"
            key={index}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <ResponsiveImage
              src={img.src}
              alt={img.alt}
              sizes="(max-width: 1200px) 100vw, 1200px"
              widths={[800, 1200, 1600, 2400]}
              priority
              imgClassName="lb-img"
            />
            <figcaption className="lb-meta">
              {img.caption ? <span className="lb-cap">{img.caption}</span> : <span />}
              <span className="lb-count" aria-hidden="true">{index + 1} / {images.length}</span>
            </figcaption>
          </m.figure>
          {images.length > 1 && (
            <button type="button" className="lb-nav lb-next" aria-label={t.next}
                    onClick={(e) => { e.stopPropagation(); next() }}>›</button>
          )}
          {/* Outside the keyed <figure> so it persists between photos and
              screen readers announce each change. */}
          <p className="sr-only" aria-live="polite">
            {`${index + 1} / ${images.length}: ${img.alt}`}
          </p>
        </m.div>
      )}
    </AnimatePresence>
  )
}
