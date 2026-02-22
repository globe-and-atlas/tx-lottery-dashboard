import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppAlpha from './AppAlpha.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppAlpha />
    </StrictMode>,
)
