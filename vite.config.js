import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import adminPlugin from './scripts/vite-plugin-admin.mjs'

// adminPlugin is dev-only (apply: 'serve') and also gated here by command,
// so the local album-admin API is never part of the production build.
export default defineConfig(({ command }) => ({
  plugins: [react(), command === 'serve' && adminPlugin()].filter(Boolean),
  base: '/',
}))
