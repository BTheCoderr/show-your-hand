import { useState } from 'react'
import type { FormEvent } from 'react'

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
          <p className="syh-product-lede">
            SHOW YOUR HAND is an original competitive card game built around one rhythm:
            <b> DROP → RESOLVE → PICK UP.</b> Build a scoring five-card hand while using specials
            to attack, defend, disrupt, and force the table to react.
          </p>

          <div className="syh-about-actions">
            <a href="/" className="syh-primary syh-link-button">Play now</a>
            <a href="/?tutorial=1" className="syh-secondary syh-link-button">How to play</a>
          </div>

          <div className="syh-about-visual" aria-label="SHOW YOUR HAND card preview">
            <img src="/cards/show-your-hand.png" alt="Show Your Hand special card" />
            <img src="/cards/drop-color.png" alt="Drop Color special card" />
            <img src="/cards/skip.png" alt="Skip special card" />
            <img src="/cards/shuffle.png" alt="Shuffle special card" />
            <img src="/cards/blank.png" alt="Blank defense card" />
          </div>

          <h2>Game modes</h2>
          <div className="syh-mode-grid">
            <article>
              <span>SOLO</span>
              <h3>1–5 CPU opponents</h3>
              <p>Learn the rules, test strategies, and play complete matches with no account.</p>
            </article>
            <article>
              <span>ONLINE BETA</span>
              <h3>Private 1v1</h3>
              <p>Create a room, share a link or QR code, ready up, reconnect, and rematch.</p>
            </article>
            <article>
              <span>COMING NEXT</span>
              <h3>Hardcore + larger tables</h3>
              <p>Hardcore Mode, 2–6 real players, 2v2, and public/private table options.</p>
            </article>
          </div>

          <h2>The special cards</h2>
          <div className="syh-card-explainers">
            <article><img src="/cards/show-your-hand.png" alt="" /><div><b>Show Your Hand</b><p>Force a target to reveal their hand for the turn.</p></div></article>
            <article><img src="/cards/drop-color.png" alt="" /><div><b>Drop Color</b><p>Name a color and force the target to drop matching number cards.</p></div></article>
            <article><img src="/cards/skip.png" alt="" /><div><b>Skip</b><p>Take the next player out of the upcoming turn unless they defend.</p></div></article>
            <article><img src="/cards/shuffle.png" alt="" /><div><b>Shuffle</b><p>Send one or two hands back and deal fresh cards.</p></div></article>
            <article><img src="/cards/blank.png" alt="" /><div><b>Blank</b><p>Cancel supported attacks without reversing them.</p></div></article>
          </div>

          <h2>Online beta</h2>
          <p>
            Online matches use a server-authoritative Supabase game service. The browser sends the
            intended move, the server validates it against the canonical game state, and each player
            only receives the hidden-information view they are allowed to see.
          </p>
          <p>
            First to 5 points wins. Rooms are private and invite-only today; competitive public
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('sending')
    const form = event.currentTarget
    const data = new FormData(form)
    try {
      await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(
          Array.from(data.entries()).map(([key, value]) => [key, String(value)]),
        ).toString(),
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
