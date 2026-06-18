import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { LazyMotion, domAnimation, AnimatePresence } from 'framer-motion'
import App from './App'
import Album from './Album'
import Projects from './Projects'
import './styles.css'

// Dev-only local album admin. Lazy-loaded and gated by import.meta.env.DEV so it
// is never bundled into the production (static) build.
const Admin = import.meta.env.DEV ? lazy(() => import('./admin/Admin')) : null

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<App />} />
        <Route path="/proyectos" element={<Projects />} />
        <Route path="/album/:slug" element={<Album />} />
        {import.meta.env.DEV && (
          <Route path="/admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
        )}
      </Routes>
    </AnimatePresence>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LazyMotion features={domAnimation}>
      <HashRouter>
        <AnimatedRoutes />
      </HashRouter>
    </LazyMotion>
  </React.StrictMode>
)
