import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppStateProvider } from './state/AppState'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppStateProvider>
      <App />
    </AppStateProvider>
  </StrictMode>,
)
