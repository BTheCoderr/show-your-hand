import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './App'
import { ProductPage, productPathFor } from './ui/ProductPage'
import './styles.css'

const productPath = productPathFor(window.location.pathname)
const container = document.getElementById('root')!

if (productPath) {
  const page = (
    <StrictMode>
      <ProductPage path={productPath} />
    </StrictMode>
  )
  if (container.dataset.prerendered === productPath) hydrateRoot(container, page)
  else createRoot(container).render(page)
} else {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js')
  })
}
