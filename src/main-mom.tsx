import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppMom from './AppMom.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppMom />
    </StrictMode>,
)
