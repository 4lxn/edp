import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { T } from './i18n'
import { langOf, to, projectPath } from './routes'

/** Language (from the URL), its strings, and path helpers bound to it. */
export function useLang() {
  const { pathname } = useLocation()
  const lang = langOf(pathname)
  return {
    lang,
    t: T[lang],
    to: (key) => to(key, lang),
    projectTo: (slug) => projectPath(slug, lang),
  }
}

/** Reveals [data-reveal] elements once as they enter the viewport. */
export function useReveal(dep) {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]:not(.is-in)')
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target) }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [dep])
}

/**
 * True while any element matching `selector` intersects the viewport.
 * IntersectionObserver only — the site has no scroll listeners.
 * Returns `fallback` when no element matches.
 */
export function useAnyInView(selector, dep, { rootMargin = '0px', fallback = false, initial = fallback } = {}) {
  const [inView, setInView] = useState(initial)
  useEffect(() => {
    const els = [...document.querySelectorAll(selector)]
    if (!els.length || !('IntersectionObserver' in window)) { setInView(fallback); return }
    const visible = new Set()
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)))
      setInView(visible.size > 0)
    }, { rootMargin })
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [selector, dep, rootMargin, fallback])
  return inView
}
