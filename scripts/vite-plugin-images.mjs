/**
 * vite-plugin-images.mjs
 *
 * DEV-ONLY: serves /_img/<width>/<format>/<path> during `npm run dev` with the
 * same on-demand resizer the production server uses (server/images.mjs), so
 * responsive <picture> elements work locally. Variants are cached in .cache/img.
 */
import path from 'node:path'
import { createImageHandler, IMG_PREFIX } from '../server/images.mjs'

export default function imagesPlugin() {
  return {
    name: 'edp-images',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root
      const handler = createImageHandler({
        sourceRoot: path.join(root, 'public'),
        cacheDir: path.join(root, '.cache', 'img'),
      })
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith(IMG_PREFIX)) return handler(req, res, next)
        next()
      })
    },
  }
}
