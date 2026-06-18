import { useEffect } from 'react'
import { m, AnimatePresence } from 'framer-motion'

/**
 * Animated fullscreen image viewer.
 * Controlled via `index` (number = open at that image, null = closed) + `setIndex`.
 * Esc closes; ←/→ navigate; clicking the backdrop closes.
 */
export default function Lightbox({ images, index, setIndex }) {
  const open = index != null
  const close = () => setIndex(null)
  const prev = () => setIndex((i) => (i + images.length - 1) % images.length)
  const next = () => setIndex((i) => (i + 1) % images.length)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, images.length])

  const img = open ? images[index] : null

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="lb"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button className="lb-close" onClick={close} aria-label="Cerrar">✕</button>
          {images.length > 1 && (
            <button className="lb-nav lb-prev" aria-label="Anterior"
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
            <img className="lb-img" src={img.src} alt={img.caption || ''} />
            <figcaption className="lb-meta">
              {img.caption ? <span className="lb-cap">{img.caption}</span> : <span />}
              <span className="lb-count">{index + 1} / {images.length}</span>
            </figcaption>
          </m.figure>
          {images.length > 1 && (
            <button className="lb-nav lb-next" aria-label="Siguiente"
                    onClick={(e) => { e.stopPropagation(); next() }}>›</button>
          )}
        </m.div>
      )}
    </AnimatePresence>
  )
}
