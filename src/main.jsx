import React, { lazy, Suspense } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter, Route } from 'react-router-dom'
import { LazyMotion, domAnimation } from 'framer-motion'
import App from './App'
import './styles.css'

// Dev-only local album admin. Lazy-loaded and gated by import.meta.env.DEV so it
// is never bundled into the production (static) build.
const Admin = import.meta.env.DEV ? lazy(() => import('./admin/Admin')) : null
const admin = Admin
  ? <Route path="/admin" element={<Suspense fallback={null}><Admin /></Suspense>} />
  : null

const tree = (
  <React.StrictMode>
    <LazyMotion features={domAnimation}>
      <BrowserRouter>
        <App admin={admin} />
      </BrowserRouter>
    </LazyMotion>
  </React.StrictMode>
)

// Prerendered pages arrive with markup → hydrate. The 404.html fallback and
// `npm run dev` arrive empty → render.
const root = document.getElementById('root')
if (root.firstElementChild) hydrateRoot(root, tree)
else createRoot(root).render(tree)
