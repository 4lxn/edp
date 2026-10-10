import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { LazyMotion, domAnimation, AnimatePresence } from 'framer-motion'
import { LANGS, langFromPath, pathFor } from './i18n'
import { ScrollManager } from './hooks'
import HeadManager from './components/HeadManager'
import Home from './pages/Home'
import Projects from './pages/Projects'
import Album from './pages/Album'
import Privacy from './pages/Privacy'
import NotFound from './pages/NotFound'

// Dev-only local album admin. Lazy-loaded and gated by import.meta.env.DEV so it
// is never bundled into the production build.
const Admin = import.meta.env.DEV ? lazy(() => import('./admin/Admin')) : null

/**
 * Routes for both languages (see src/i18n.js for the URL scheme). Rendered by
 * entry-client.jsx (BrowserRouter) and entry-server.jsx (StaticRouter).
 */
export default function App() {
  const location = useLocation()

  return (
    <LazyMotion features={domAnimation}>
      <HeadManager />
      <ScrollManager />
      <AnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          {/* caseSensitive: /Proyectos is a 404 on the server, so it must be here too */}
          {LANGS.map((lang) => [
            <Route caseSensitive key={`${lang}-home`} path={pathFor(lang, 'home')} element={<Home lang={lang} />} />,
            <Route caseSensitive key={`${lang}-projects`} path={pathFor(lang, 'projects')} element={<Projects lang={lang} />} />,
            <Route caseSensitive key={`${lang}-album`} path={pathFor(lang, 'album', ':slug')} element={<Album lang={lang} />} />,
            <Route caseSensitive key={`${lang}-privacy`} path={pathFor(lang, 'privacy')} element={<Privacy lang={lang} />} />,
          ])}
          {Admin && (
            <Route path="/admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
          )}
          <Route path="*" element={<NotFound lang={langFromPath(location.pathname)} />} />
        </Routes>
      </AnimatePresence>
    </LazyMotion>
  )
}
