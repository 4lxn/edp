import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/montserrat'
import Admin from './Admin'
import './admin.css'

createRoot(document.getElementById('admin')).render(
  <React.StrictMode>
    <Admin />
  </React.StrictMode>
)
