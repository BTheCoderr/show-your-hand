import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { ProductPage } from './ui/ProductPage'
import { SITE_META, SITE_ORIGIN, SITE_PATHS, type SitePath } from './ui/site/siteConfig'

export { SITE_META, SITE_ORIGIN, SITE_PATHS }

export function renderPage(path: SitePath): string {
  return renderToString(
    <StrictMode>
      <ProductPage path={path} />
    </StrictMode>,
  )
}
