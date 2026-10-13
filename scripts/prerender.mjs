// Writes static HTML for the public product pages (about, support, privacy,
// terms, feedback) so they load without JavaScript and carry per-page metadata.
// Netlify serves dist/<page>.html at /<page> before the SPA fallback rewrite.
import { readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const ssrDir = path.join(root, '.prerender')

const { renderPage, SITE_META, SITE_ORIGIN, SITE_PATHS } = await import(
  pathToFileURL(path.join(ssrDir, 'prerender.js')).href
)

const escapeAttr = (value) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function replaceOnce(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`prerender: could not find ${label} in dist/index.html`)
  return html.replace(pattern, replacement)
}

const template = await readFile(path.join(dist, 'index.html'), 'utf8')

for (const pagePath of SITE_PATHS) {
  const meta = SITE_META[pagePath]
  const url = `${SITE_ORIGIN}${pagePath}`
  let html = template
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${escapeAttr(meta.title)}</title>`, '<title>')
  html = replaceOnce(
    html,
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
    'meta description',
  )
  html = replaceOnce(
    html,
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${url}" />`,
    'canonical link',
  )
  html = replaceOnce(html, /<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`, 'og:url')
  html = replaceOnce(
    html,
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
    'og:title',
  )
  html = replaceOnce(
    html,
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
    'og:description',
  )
  html = replaceOnce(
    html,
    /<div id="root"><\/div>/,
    `<div id="root" data-prerendered="${pagePath}">${renderPage(pagePath)}</div>`,
    'root container',
  )
  const file = path.join(dist, `${pagePath.slice(1)}.html`)
  await writeFile(file, html)
  console.log(`prerendered ${pagePath} -> dist/${path.basename(file)}`)
}

await rm(ssrDir, { recursive: true, force: true })
