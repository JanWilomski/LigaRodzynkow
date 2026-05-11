import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { seedIfEmpty } from '@/lib/mockApi'
import './index.css'

// Auto-seed mock danymi przy pierwszym uruchomieniu (do usunięcia gdy backend będzie gotowy)
seedIfEmpty()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
