/**
 * vite-plugin-admin.mjs
 *
 * DEV-ONLY: mounts the same admin API the production server uses
 * (server/admin-api.mjs) on the Vite dev server, but backed by the repo files
 * themselves (DirectStore): edits land in public/albums/ and
 * src/content/site.json, and src/albums.generated.js is regenerated after each
 * change. Publish with `git push` as usual.
 *
 * The dev server listens on the whole network (`--host`), so the admin needs a
 * password: ADMIN_PASSWORD if set, otherwise a random one printed in the
 * terminal at startup.
 */
import crypto from 'node:crypto'
import path from 'node:path'
import { DirectStore } from '../server/content-store.mjs'
import { createAdminApi } from '../server/admin-api.mjs'
import { syncAlbums, ROOT } from './sync-albums.mjs'

const PASSWORD = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url')

export default function adminPlugin() {
  let api
  return {
    name: 'edp-admin',
    apply: 'serve', // dev only — the production server mounts its own copy
    async configureServer(server) {
      api = await createAdminApi({
        store: new DirectStore({ root: ROOT }),
        mode: 'dev',
        password: PASSWORD,
        dataDir: path.join(ROOT, '.cache'),
        onChange: () => syncAlbums(),
      })
      server.httpServer?.once('listening', () => {
        const addr = server.httpServer.address()
        const port = typeof addr === 'object' && addr ? addr.port : 5173
        const pw = process.env.ADMIN_PASSWORD ? '(tu ADMIN_PASSWORD)' : PASSWORD
        server.config.logger.info(`\n  Admin: http://localhost:${port}/admin/ · contraseña: ${pw}\n`)
      })
      server.middlewares.use((req, res, next) => {
        // Vite serves admin/index.html at /admin/ (production serves it at /admin).
        if (req.url === '/admin' || req.url?.startsWith('/admin?')) {
          res.writeHead(302, { Location: '/admin/' + req.url.slice('/admin'.length) })
          return res.end()
        }
        if (!req.url || !req.url.startsWith('/admin/api/')) return next()
        api(req, res).catch(next)
      })
    },
  }
}
