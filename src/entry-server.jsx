/**
 * Server entry — used only at build time by scripts/prerender.mjs to turn each
 * route into static HTML (GitHub Pages serves it; the client then hydrates).
 */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { LazyMotion, domAnimation } from 'framer-motion'
import App from './App'

export { allRoutes } from './routes'
export { headFor, headHtml } from './seo'
export { SITE_URL } from './facts'

export function render(url) {
  return renderToString(
    <React.StrictMode>
      <LazyMotion features={domAnimation}>
        <StaticRouter location={url}>
          <App />
        </StaticRouter>
      </LazyMotion>
    </React.StrictMode>
  )
}
