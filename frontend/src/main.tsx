import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { reportWebVitals } from './utils/webVitals'

// Los mocks (y `axios-mock-adapter`) se cargan bajo demanda para no
// incluirlos en el bundle inicial ni en producción. La importación no
// bloquea el primer render.
if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  import('./services/mocks').then(({ setupMocks }) => setupMocks())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

reportWebVitals()

