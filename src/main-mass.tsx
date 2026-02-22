import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppMass from './AppMass.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppMass />
    </StrictMode>,
)
