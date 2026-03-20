import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppGibson from './AppGibson.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppGibson />
  </StrictMode>,
)
