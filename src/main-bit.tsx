import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppBit from './AppBit.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppBit />
    </StrictMode>,
)
