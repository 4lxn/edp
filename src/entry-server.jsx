/**
 * Server entry — used only by scripts/prerender.mjs at build time to turn every
 * route into static HTML (built with `vite build --ssr`).
 */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import App from './App'
import { allPaths } from './i18n'
import { buildHead, headHtml, robotsTxt, sitemapXml, SITE_URL } from './seo'

export function render(url) {
  const html = renderToString(
    <React.StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </React.StrictMode>
  )
  const head = buildHead(url)
  return { html, head: headHtml(head), htmlLang: head.htmlLang, status: head.status }
}

export { allPaths, robotsTxt, sitemapXml, SITE_URL }
