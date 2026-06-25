import React from 'react'
import ReactDOM from 'react-dom/client'
// Inter — the typeface used throughout the Figma design (bundled offline)
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import App from './App'
import './index.css'
import { getDb } from './db/database'

getDb().then(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
})
