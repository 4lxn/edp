/**
 * prerender.mjs — runs after `vite build` and `vite build --ssr`.
 *
 * Renders every route to dist/<route>/index.html with its own title,
 * description, canonical, hreflang, Open Graph and JSON-LD, so crawlers and
 * link previews get real HTML (GitHub Pages has no server-side routing).
 * Also writes sitemap.xml, robots.txt and 404.html (the SPA fallback for
 * unknown paths).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const SSR = path.join(ROOT, 'dist-ssr')

const { render, allRoutes, headFor, headHtml, SITE_URL } =
  await import(pathToFileURL(path.join(SSR, 'entry-server.js')).href)

const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
const HEAD = /<!--app-head-->[\s\S]*?<!--\/app-head-->/
const fill = (lang, head, html) => template
  .replace('<html lang="es">', `<html lang="${lang}">`)
  .replace(HEAD, head)
  .replace('<!--app-html-->', html)

const routes = allRoutes()
for (const r of routes) {
  const head = headFor(r.path)
  const html = render(r.path)
  if (/\[[A-ZÁÉÍÓÚÑ_ /]{3,}\]/.test(html)) throw new Error(`placeholder text rendered on ${r.path}`)
  const file = path.join(DIST, r.path, 'index.html')
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, fill(head.lang, headHtml(head), html))
}

// Unknown paths: GitHub Pages serves 404.html; the app boots and routes client-side.
const nf = headFor('/__not-found__')
fs.writeFileSync(path.join(DIST, '404.html'), fill('es', headHtml(nf), ''))

const today = new Date().toISOString().slice(0, 10)
const urls = routes.map((r) => {
  const h = headFor(r.path)
  return `  <url>
    <loc>${h.canonical}</loc>
    <lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="es" href="${h.alternates.es}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${h.alternates.en}"/>
  </url>`
}).join('\n')
fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`)
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)

fs.rmSync(SSR, { recursive: true, force: true })
console.log(`✓ Prerendered ${routes.length} routes + 404.html, sitemap.xml, robots.txt`)
