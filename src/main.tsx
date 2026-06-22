import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import GooKeepRouter from './GooKeepRouter.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <GooKeepRouter />
    </BrowserRouter>
  </StrictMode>,
)
