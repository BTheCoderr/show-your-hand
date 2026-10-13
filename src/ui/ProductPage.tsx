import { AboutPage } from './site/AboutPage'
import { FeedbackPage } from './site/FeedbackPage'
import { PrivacyPage } from './site/PrivacyPage'
import { SiteLayout } from './site/SiteLayout'
import { SupportPage } from './site/SupportPage'
import { TermsPage } from './site/TermsPage'
import { normalizeSitePath, type SitePath } from './site/siteConfig'

export type ProductPath = SitePath

export function productPathFor(pathname: string): ProductPath | null {
  return normalizeSitePath(pathname)
}

export function isProductPath(pathname: string): boolean {
  return productPathFor(pathname) !== null
}

const PAGES: Record<ProductPath, () => JSX.Element> = {
  '/about': AboutPage,
  '/support': SupportPage,
  '/privacy': PrivacyPage,
  '/terms': TermsPage,
  '/feedback': FeedbackPage,
}

export function ProductPage({ path }: { path: ProductPath }) {
  const Page = PAGES[path]
  return (
    <SiteLayout path={path}>
      <Page />
    </SiteLayout>
  )
}
