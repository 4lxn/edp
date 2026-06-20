import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

/** True once the page has scrolled past `threshold` px (for condensed header). */
export function useScrolledPast(threshold) {
  const [past, setPast] = useState(false)
  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > threshold)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return past
}

/** Reveals [data-reveal] elements on scroll via IntersectionObserver. */
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]')
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/**
 * Props for a route's root <m.div> page-transition + scroll-to-top on mount.
 * Pure opacity fade so it doesn't clash with per-section entrance choreography.
 */
export function usePageMotion() {
  const reduce = useReducedMotion()
  useEffect(() => { window.scrollTo(0, 0) }, [])
  return reduce
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.3, ease: [0.2, 0.7, 0.2, 1] },
      }
}
