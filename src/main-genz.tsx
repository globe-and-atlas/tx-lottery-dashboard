import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppGenz from './AppGenz.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppGenz />
    </StrictMode>,
)
