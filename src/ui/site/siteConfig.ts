export const SITE_ORIGIN = 'https://show-your-hand.netlify.app'
export const TAGLINE = 'DROP. PICK UP. ATTACK. DEFEND. BUT NEVER SHOW YOUR HAND.'

export const POLICY_EFFECTIVE = 'October 12, 2026'
export const POLICY_UPDATED = 'October 12, 2026'

export const SITE_PATHS = ['/about', '/support', '/privacy', '/terms', '/feedback'] as const
export type SitePath = (typeof SITE_PATHS)[number]

export function normalizeSitePath(pathname: string): SitePath | null {
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return (SITE_PATHS as readonly string[]).includes(trimmed) ? (trimmed as SitePath) : null
}

export const SITE_META: Record<SitePath, { title: string; description: string }> = {
  '/about': {
    title: 'SHOW YOUR HAND — Original 70-card competitive card game',
    description:
      'Drop, pick up, attack, and defend in SHOW YOUR HAND, an original 70-card game with solo play against 1–5 CPU opponents and private online 1v1 rooms.',
  },
  '/support': {
    title: 'Help Center — SHOW YOUR HAND',
    description:
      'Get help with SHOW YOUR HAND: rules, special cards, solo and online play, invite codes, reconnecting, saved games, installing the app, and contacting support.',
  },
  '/privacy': {
    title: 'Privacy Policy — SHOW YOUR HAND',
    description:
      'How SHOW YOUR HAND handles local saves, online room data, feedback, and third-party infrastructure in the browser game and iPhone app.',
  },
  '/terms': {
    title: 'Terms of Use — SHOW YOUR HAND',
    description: 'Terms of use for the SHOW YOUR HAND browser game and iPhone app.',
  },
  '/feedback': {
    title: 'Contact & Feedback — SHOW YOUR HAND',
    description: 'Report a bug, ask for help, or send feedback about SHOW YOUR HAND.',
  },
}

export const NAV_LINKS: Array<{ href: SitePath | '/'; label: string }> = [
  { href: '/', label: 'Play' },
  { href: '/about', label: 'About' },
  { href: '/support', label: 'Support' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
]

export const FEEDBACK_TOPICS = [
  { value: 'bug', label: 'Report a bug' },
  { value: 'support', label: 'Gameplay or rules question' },
  { value: 'online', label: 'Online multiplayer problem' },
  { value: 'install', label: 'App install or update' },
  { value: 'feedback', label: 'Feedback or idea' },
  { value: 'privacy', label: 'Privacy or data request' },
] as const

export type FeedbackTopic = (typeof FEEDBACK_TOPICS)[number]['value']

export const FEEDBACK_PLATFORMS = [
  { value: 'browser', label: 'Web browser' },
  { value: 'iphone-app', label: 'iPhone app' },
  { value: 'other', label: 'Other / not sure' },
] as const
