import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppMystic from './AppMystic.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppMystic />
    </StrictMode>,
)
