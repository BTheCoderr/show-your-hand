import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { isProductPath, ProductPage } from './ui/ProductPage'
import './styles.css'

const path = window.location.pathname
const content = isProductPath(path) ? <ProductPage path={path} /> : <App />

createRoot(document.getElementById('root')!).render(
  <StrictMode>{content}</StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}
