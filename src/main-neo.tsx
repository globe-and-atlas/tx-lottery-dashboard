import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppNeo from './AppNeo.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppNeo />
    </StrictMode>,
)
