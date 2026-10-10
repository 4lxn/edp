import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
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

/**
 * Reveals [data-reveal] elements on scroll via IntersectionObserver.
 * They're only hidden when JS runs (html.js, set by the boot script in
 * index.html), so the pre-rendered page is fully readable without JS.
 */
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]:not(.is-in)')
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

// The first page of a visit is pre-rendered, so the browser already handles its
// scroll position (top on a fresh load, restored on reload) — don't override it.
let initialPage = true
const isReload = () =>
  typeof performance !== 'undefined' && performance.getEntriesByType?.('navigation')[0]?.type === 'reload'

/**
 * Props for a route's root <m.div> page transition. Also scrolls to the top
 * when a page mounts after in-app navigation — unless the URL targets a
 * section (#contacto), which <ScrollManager> handles.
 */
export function usePageMotion() {
  const reduce = useReducedMotion()
  useEffect(() => {
    if (initialPage) { initialPage = false; return }
    // 'instant' overrides html { scroll-behavior: smooth } — a new page starts at the top.
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  return reduce
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.3, ease: [0.2, 0.7, 0.2, 1] },
      }
}

/**
 * Scrolls to #hash targets after navigation. With page transitions the target
 * may not exist yet (the old page is still fading out), so it retries briefly.
 * Links within the page glide there; a fresh load or a new page jumps straight
 * to the section. Same-page links without a hash (the logo) go to the top.
 */
export function ScrollManager() {
  const { pathname, hash, key } = useLocation()
  const prevPath = useRef(null)

  useEffect(() => {
    const firstRender = prevPath.current === null
    const samePage = !firstRender && prevPath.current === pathname
    prevPath.current = pathname

    if (!hash) {
      if (samePage) window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (firstRender && isReload()) return // keep the browser's restored position
    let id = ''
    try { id = decodeURIComponent(hash.slice(1)) } catch { return }
    let tries = 0
    let timer
    const go = () => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: samePage ? 'smooth' : 'instant', block: 'start' })
      else if (tries++ < 40) timer = setTimeout(go, 50)
    }
    go()
    return () => clearTimeout(timer)
  }, [pathname, hash, key])

  return null
}

/** Locks page scroll while `active` (menus, lightbox). */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    return () => { html.style.overflow = prev }
  }, [active])
}

/**
 * Keeps keyboard focus inside `ref` while `active`: focuses the first control
 * on open, cycles Tab/Shift+Tab, calls `onEscape` on Esc, and returns focus to
 * whatever had it before when closed.
 */
export function useFocusTrap(ref, active, onEscape) {
  const escape = useRef(onEscape)
  escape.current = onEscape

  useEffect(() => {
    if (!active || !ref.current) return
    const root = ref.current
    const before = document.activeElement
    const focusables = () => [...root.querySelectorAll(
      'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
    )].filter(el => el.getClientRects().length)

    focusables()[0]?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); escape.current?.(); return }
      if (e.key !== 'Tab') return
      const list = focusables()
      if (!list.length) return
      const first = list[0], last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (before && typeof before.focus === 'function') before.focus()
    }
  }, [active, ref])
}
