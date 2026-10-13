import type { ReactNode } from 'react'
import { APP_VERSION } from '../../version'
import { NAV_LINKS, TAGLINE, type SitePath } from './siteConfig'

export function BrandLogo({ className = '', eager = false }: { className?: string; eager?: boolean }) {
  return (
    <picture className={`syh-brand-logo ${className}`}>
      <source srcSet="/brand/logo-horizontal.webp" type="image/webp" />
      <img
        src="/brand/logo-horizontal.png"
        alt="SHOW YOUR HAND"
        width={805}
        height={311}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    </picture>
  )
}

function currentFor(href: string, path: SitePath): 'page' | 'true' | undefined {
  if (href === path) return 'page'
  if (href === '/support' && path === '/feedback') return 'true'
  return undefined
}

export function SiteLayout({ path, children }: { path: SitePath; children: ReactNode }) {
  return (
    <div className="syh-site">
      <a className="syh-skip-link" href="#main">
        Skip to content
      </a>
      <header className="syh-site-header">
        <div className="syh-site-header-inner">
          <a href="/" className="syh-site-brand" aria-label="SHOW YOUR HAND — play the game">
            <BrandLogo eager />
          </a>
          <nav aria-label="Main">
            <ul>
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={currentFor(link.href, path)}
                    className={link.href === '/' ? 'is-play' : undefined}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="syh-site-footer">
      <div className="syh-site-footer-inner">
        <div>
          <p className="syh-site-footer-brand">SHOW YOUR HAND</p>
          <p className="syh-site-footer-tagline">{TAGLINE}</p>
        </div>
        <nav aria-label="Footer">
          <ul>
            <li><a href="/">Play now</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/support">Help Center</a></li>
            <li><a href="/feedback">Contact &amp; feedback</a></li>
            <li><a href="/privacy">Privacy Policy</a></li>
            <li><a href="/terms">Terms of Use</a></li>
          </ul>
        </nav>
      </div>
      <p className="syh-site-footer-meta">
        © 2026 SHOW YOUR HAND · Web {APP_VERSION}
      </p>
    </footer>
  )
}

export function PageIntro({
  kicker,
  title,
  children,
}: {
  kicker: string
  title: string
  children?: ReactNode
}) {
  return (
    <header className="syh-page-intro">
      <p className="syh-kicker">{kicker}</p>
      <h1>{title}</h1>
      {children}
    </header>
  )
}
