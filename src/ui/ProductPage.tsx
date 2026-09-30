import { useState } from 'react'

export type ProductPath = '/about' | '/privacy' | '/terms' | '/feedback'

export function isProductPath(pathname: string): pathname is ProductPath {
  return pathname === '/about' || pathname === '/privacy' || pathname === '/terms' || pathname === '/feedback'
}

const LAST_UPDATED = 'September 30, 2026'

export function ProductPage({ path }: { path: ProductPath }) {
  if (path === '/feedback') return <FeedbackPage />

  const content = {
    '/about': {
      kicker: 'About the game',
      title: 'SHOW YOUR HAND',
      body: (
        <>
          <p>
            SHOW YOUR HAND is an original competitive card game built around a simple rhythm:
            <b> drop, resolve, pick up</b>. Number cards build scoring hands. Special cards attack,
            disrupt, defend, and force players to react.
          </p>
          <p>
            The browser edition supports solo play, guided onboarding, and a private online 1v1 beta.
            The tabletop rules remain the source of truth while the digital version adds presentation,
            matchmaking infrastructure, reconnect support, and playtest analytics.
          </p>
          <h2>Current beta</h2>
          <p>
            First to 5 points wins. Online rooms are private and invite-only. Competitive public
            matchmaking and larger real-player tables are still in development.
          </p>
        </>
      ),
    },
    '/privacy': {
      kicker: 'Product information',
      title: 'Privacy',
      body: (
        <>
          <p>
            SHOW YOUR HAND does not require an account for the current beta. Solo preferences and
            local stats are stored in your browser. Online rooms use temporary room identifiers,
            display names, room tokens, gameplay state, connection timestamps, and match statistics
            so two devices can stay synchronized.
          </p>
          <p>
            Private room tokens are used to reconnect you to the same seat. Do not share them.
            Invite links contain only the public room code, not your private room token.
          </p>
          <p>
            Online beta records may be retained for reliability, security, playtesting, and product
            improvement. Avoid entering sensitive personal information as your table name or feedback.
          </p>
        </>
      ),
    },
    '/terms': {
      kicker: 'Product information',
      title: 'Beta Terms',
      body: (
        <>
          <p>
            SHOW YOUR HAND is currently a beta game and may change, reset rooms, experience downtime,
            or contain bugs. Online play is provided for testing and entertainment.
          </p>
          <p>
            Do not attempt to disrupt rooms, exploit hidden information, impersonate other players,
            automate abusive traffic, or interfere with the service. The game design, branding, card
            art, and software remain protected by their applicable rights.
          </p>
          <p>
            The beta is provided as-is while gameplay, networking, and presentation continue to be
            refined.
          </p>
        </>
      ),
    },
  }[path]

  return (
    <main className="syh-product-page">
      <header>
        <a href="/" className="syh-product-back">← Back to game</a>
        <span>Beta 0.1.0</span>
      </header>
      <article>
        <p className="syh-kicker">{content.kicker}</p>
        <h1>{content.title}</h1>
        {content.body}
        <small>Last updated {LAST_UPDATED}</small>
      </article>
    </main>
  )
}

function FeedbackPage() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('sending')
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data as unknown as Record<string, string>).toString(),
      })
      form.reset()
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="syh-product-page">
      <header>
        <a href="/" className="syh-product-back">← Back to game</a>
        <span>Beta 0.1.0</span>
      </header>
      <article>
        <p className="syh-kicker">Playtest feedback</p>
        <h1>Help improve SHOW YOUR HAND</h1>
        <p>
          Tell us what felt confusing, slow, unfair, fun, or broken. Include the room code only if it
          helps explain an online issue.
        </p>
        <form name="feedback" method="POST" data-netlify="true" onSubmit={submit} className="syh-feedback-form">
          <input type="hidden" name="form-name" value="feedback" />
          <label>
            Your name <span>(optional)</span>
            <input name="name" maxLength={80} />
          </label>
          <label>
            What happened?
            <textarea name="message" required rows={7} maxLength={2500} />
          </label>
          <label>
            Room code <span>(optional)</span>
            <input name="room-code" maxLength={6} />
          </label>
          <button type="submit" className="syh-primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Send feedback'}
          </button>
          {status === 'sent' ? <p className="syh-feedback-success">Feedback sent. Thank you.</p> : null}
          {status === 'error' ? <p className="syh-online-error">Could not send right now. Try again later.</p> : null}
        </form>
        <small>Last updated {LAST_UPDATED}</small>
      </article>
    </main>
  )
}
