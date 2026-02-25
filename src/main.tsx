import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@excalidraw/excalidraw/index.css' // Import CSS Excalidraw
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
