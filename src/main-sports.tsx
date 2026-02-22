import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppSports from './AppSports.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppSports />
    </StrictMode>,
)
