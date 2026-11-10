import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { resolve, SERVICE_KEYS } from './routes'
import { headFor } from './seo'
import { useReveal } from './hooks'
import Header from './components/Header'
import Footer, { StickyCta } from './components/Footer'
import Landing from './pages/Landing'
import Projects from './pages/Projects'
import Project from './pages/Project'
import { Quote, Service, Privacy, NotFound } from './pages/Pages'

function Page({ r }) {
  if (!r) return <NotFound />
  if (r.key === 'home') return <Landing />
  if (r.key === 'projects') return <Projects />
  if (r.key === 'project') return <Project key={r.slug} slug={r.slug} />
  if (r.key === 'quote') return <Quote />
  if (r.key === 'privacy') return <Privacy />
  if (SERVICE_KEYS.includes(r.key)) return <Service key={r.key} k={r.key} />
  return <NotFound />
}

/** Keeps <head> and scroll position in step with client-side navigation. */
function useRouteEffects() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    const h = headFor(pathname)
    document.documentElement.lang = h.lang
    document.title = h.title
    const set = (sel, attr, val) => { const el = document.querySelector(sel); if (el && val) el.setAttribute(attr, val) }
    set('meta[name="description"]', 'content', h.description)
    set('link[rel="canonical"]', 'href', h.canonical)
  }, [pathname])
  useEffect(() => {
    const el = hash && document.getElementById(hash.slice(1))
    if (el) el.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])
}

function Site() {
  const { pathname } = useLocation()
  const r = resolve(pathname)
  useRouteEffects()
  useReveal(pathname)
  const bare = r && r.key === 'home' // the landing hero runs under the header
  return (
    <>
      <Header />
      <main id="contenido" key={pathname} className={'page' + (bare ? '' : ' page-pad')} lang={r ? r.lang : undefined}>
        <Page r={r} />
      </main>
      <Footer />
      <StickyCta />
    </>
  )
}

/** `admin` is the dev-only album panel route, injected by main.jsx (never in the build). */
export default function App({ admin = null }) {
  return (
    <Routes>
      {admin}
      <Route path="*" element={<Site />} />
    </Routes>
  )
}
