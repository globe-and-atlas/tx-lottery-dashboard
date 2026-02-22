import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppAlt from './AppAlt.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppAlt />
    </StrictMode>,
)
