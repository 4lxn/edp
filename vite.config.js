import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import adminPlugin from './scripts/vite-plugin-admin.mjs'
import imagesPlugin from './scripts/vite-plugin-images.mjs'

// Dev-only plugins (apply: 'serve', and gated here by command): the local
// album-admin API and the /_img/ resizer are never part of a production build.
//
// `npm run build` makes two bundles: the browser app (dist/client) and a
// server bundle (dist/server) that scripts/prerender.mjs uses to write every
// page as static HTML.
export default defineConfig(({ command, isSsrBuild }) => ({
  plugins: [
    react(),
    command === 'serve' && adminPlugin(),
    command === 'serve' && imagesPlugin(),
  ].filter(Boolean),
  base: '/',
  build: {
    outDir: isSsrBuild ? 'dist/server' : 'dist/client',
    // hashed JS/CSS/fonts live under /_app/ (cached for a year); /assets/ stays
    // for the site photos in public/assets.
    assetsDir: '_app',
  },
}))
