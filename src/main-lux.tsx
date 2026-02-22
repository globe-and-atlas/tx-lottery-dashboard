import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppLux from './AppLux.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppLux />
    </StrictMode>,
)
