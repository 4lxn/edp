import { useEffect, useRef } from 'react'
import { m, AnimatePresence } from 'framer-motion'

/**
 * Fullscreen image viewer.
 * Controlled via `index` (number = open at that image, null = closed) + `setIndex`.
 * Esc closes; ←/→ navigate; clicking the backdrop closes. Focus returns to the
 * element that opened it. The photo is never shown larger than its source.
 */
export default function Lightbox({ images, index, setIndex, labels = {} }) {
  const open = index != null
  const closeRef = useRef(null)
  const close = () => setIndex(null)
  const prev = () => setIndex((i) => (i + images.length - 1) % images.length)
  const next = () => setIndex((i) => (i + 1) % images.length)

  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    if (closeRef.current) closeRef.current.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      if (opener && opener.focus) opener.focus()
    }
  }, [open, images.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const img = open ? images[index] : null

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="lb"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={img.alt || img.caption || ''}
        >
          <button ref={closeRef} className="lb-close" onClick={close} aria-label={labels.close || 'Cerrar'}>✕</button>
          {images.length > 1 && (
            <button className="lb-nav lb-prev" aria-label={labels.prev || 'Anterior'}
                    onClick={(e) => { e.stopPropagation(); prev() }}>‹</button>
          )}
          <m.figure
            className="lb-fig"
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <img className="lb-img" src={img.src} alt={img.alt || img.caption || ''}
                 width={img.w} height={img.h} style={{ maxWidth: `min(100%, ${img.w}px)` }} />
            <figcaption className="lb-meta">
              {img.caption ? <span className="lb-cap">{img.caption}</span> : <span />}
              <span className="lb-count">{index + 1} / {images.length}</span>
            </figcaption>
          </m.figure>
          {images.length > 1 && (
            <button className="lb-nav lb-next" aria-label={labels.next || 'Siguiente'}
                    onClick={(e) => { e.stopPropagation(); next() }}>›</button>
          )}
        </m.div>
      )}
    </AnimatePresence>
  )
}
