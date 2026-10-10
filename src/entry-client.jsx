import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource-variable/montserrat'
import '@fontsource-variable/lora'
import '@fontsource-variable/lora/wght-italic.css'
import './styles.css'
import App from './App'

// Tells the boot script in index.html that the app started (see its fallback).
window.__edpStarted = true

const container = document.getElementById('root')
const app = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

// Production pages arrive pre-rendered (scripts/prerender.mjs) → hydrate them.
// `npm run dev` serves an empty #root → render from scratch.
if (container.firstElementChild) hydrateRoot(container, app)
else createRoot(container).render(app)
