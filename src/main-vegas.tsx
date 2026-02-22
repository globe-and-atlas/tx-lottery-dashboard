import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppVegas from './AppVegas.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppVegas />
    </StrictMode>,
)
