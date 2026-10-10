import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import adminPlugin from './scripts/vite-plugin-admin.mjs'
import imagesPlugin from './scripts/vite-plugin-images.mjs'

// Dev-only plugins (apply: 'serve', and gated here by command): the admin API
// on the repo files and the /_img/ resizer. The production server has its own.
//
// `npm run build` makes three bundles: the site (dist/client), the admin page
// (`--mode admin`, added to dist/client/admin/ with its own chunks so the site
// never loads admin code) and a server bundle (dist/server) that
// scripts/prerender.mjs uses to write every page as static HTML.
export default defineConfig(({ command, mode, isSsrBuild }) => ({
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
    ...(mode === 'admin' && {
      emptyOutDir: false, // the site build is already there
      copyPublicDir: false,
      rollupOptions: { input: { admin: fileURLToPath(new URL('./admin/index.html', import.meta.url)) } },
    }),
  },
}))
