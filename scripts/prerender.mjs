/**
 * prerender.mjs — last step of `npm run build` (after the client + SSR bundles).
 *
 * Writes into dist/client:
 *   - one static HTML file per page and language (index.html, proyectos/index.html,
 *     en/projects/<slug>/index.html, …) with its full <head> and content, so
 *     search engines and link previews see real pages without running JS
 *   - 404.html, sitemap.xml, robots.txt, apple-touch-icon.png, icon-512.png
 *   - .br / .gz copies of text files (served by server/index.mjs)
 * and dist/img-warm.json: the AVIF/OG image variants the pages use, which the
 * server pre-generates after it starts.
 *
 * Fails the build if a page is missing its title, description, canonical or h1.
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const CLIENT = path.join(DIST, 'client')
const SERVER_ENTRY = path.join(DIST, 'server', 'entry-server.js')

const template = fs.readFileSync(path.join(CLIENT, 'index.html'), 'utf8')
const { render, allPaths, sitemapXml, robotsTxt } = await import(pathToFileURL(SERVER_ENTRY).href)

const problems = []
const warm = new Set()

function write(rel, data) {
  const file = path.join(CLIENT, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, data)
}

function renderPage(url) {
  const { html, head, htmlLang } = render(url)
  // Function replacers: a "$&" or "$'" typed into content must stay literal.
  const out = template
    .replace(/<html lang="[^"]*">/, () => `<html lang="${htmlLang}">`)
    .replace('<!--app-head-->', () => head)
    .replace('<!--app-html-->', () => html)

  const checks = [
    ['<title>', /<title>[^<]+<\/title>/],
    ['meta description', /<meta name="description" content="[^"]+">/],
    ['<h1>', /<h1[\s>]/],
  ]
  if (!url.endsWith('/404')) checks.push(['canonical', /<link rel="canonical" href="https:\/\/[^"]+">/])
  for (const [label, re] of checks) if (!re.test(out)) problems.push(`${url}: missing ${label}`)
  if (/undefined|\[object Object\]|NaN/.test(head + html)) problems.push(`${url}: "undefined"/"NaN" in output`)

  for (const m of out.matchAll(/\/_img\/(?:\d+\/avif|og\/jpeg)\/[^\s",]+/g)) warm.add(m[0])
  return out
}

// 1. Pages
const paths = allPaths()
for (const url of paths) {
  write(url === '/' ? 'index.html' : path.join(url.slice(1), 'index.html'), renderPage(url))
}
// One 404 per language — the server picks by URL prefix so the page hydrates
// with matching text.
write('404.html', renderPage('/404'))
write(path.join('en', '404.html'), renderPage('/en/404'))

// 2. Sitemap + robots
write('sitemap.xml', sitemapXml(new Date().toISOString().slice(0, 10)))
write('robots.txt', robotsTxt())

// 3. PNG icons from the SVG monogram (iOS home screen, schema.org logo)
const svg = fs.readFileSync(path.join(CLIENT, 'favicon.svg'))
const icon = (size) => sharp(svg, { density: 72 * (size / 48) * 2 })
  .resize(size, size).flatten({ background: '#2C2C2C' }).png()
await icon(180).toFile(path.join(CLIENT, 'apple-touch-icon.png'))
await icon(512).toFile(path.join(CLIENT, 'icon-512.png'))

// 4. Image variants for the server to pre-generate — in page order, so the
//    homepage hero (preloaded first in its <head>) is ready first.
fs.writeFileSync(path.join(DIST, 'img-warm.json'), JSON.stringify([...warm], null, 1))

// 5. Pre-compressed copies of text files
let compressed = 0
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])
for (const file of walk(CLIENT)) {
  if (!/\.(html|js|css|svg|xml|txt|json)$/.test(file)) continue
  const buf = fs.readFileSync(file)
  if (buf.length < 1024) continue
  fs.writeFileSync(`${file}.br`, zlib.brotliCompressSync(buf, {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length },
  }))
  fs.writeFileSync(`${file}.gz`, zlib.gzipSync(buf, { level: 9 }))
  compressed++
}

if (problems.length) {
  console.error(`✗ Prerender found ${problems.length} problem(s):\n  ` + problems.join('\n  '))
  process.exit(1)
}
console.log(`✓ Pre-rendered ${paths.length} pages + 2 × 404, sitemap.xml, robots.txt, icons`)
console.log(`  ${warm.size} image variants listed for warm-up · ${compressed} files pre-compressed`)
