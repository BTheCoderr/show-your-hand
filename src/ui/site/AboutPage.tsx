import { APP_VERSION } from '../../version'
import { BrandLogo } from './SiteLayout'
import { TAGLINE } from './siteConfig'

const HERO_CARDS = [
  { src: '/cards/orange-5.png', alt: 'Orange 5' },
  { src: '/cards/show-your-hand.png', alt: 'Show Your Hand special card' },
  { src: '/cards/drop-color.png', alt: 'Drop Color special card' },
  { src: '/cards/skip.png', alt: 'Skip special card' },
  { src: '/cards/shuffle.png', alt: 'Shuffle special card' },
  { src: '/cards/blue-3.png', alt: 'Blue 3' },
]

const SPECIALS = [
  {
    art: '/cards/show-your-hand.png',
    name: 'Show Your Hand',
    role: 'Attack',
    text: 'Force a target to reveal their hand to the whole table until the turn ends.',
  },
  {
    art: '/cards/drop-color.png',
    name: 'Drop Color',
    role: 'Attack',
    text: 'Name a color. Your target drops every numbered card in it — and you can claim them.',
  },
  {
    art: '/cards/skip.png',
    name: 'Skip',
    role: 'Attack',
    text: 'Take the next player out of their upcoming turn unless they defend.',
  },
  {
    art: '/cards/shuffle.png',
    name: 'Shuffle',
    role: 'Attack',
    text: 'Send one or two hands back into the deck and deal them fresh cards.',
  },
  {
    art: '/cards/blank.png',
    name: 'Blank',
    role: 'Defense',
    text: 'Cancel an attack aimed at you. Matching specials can also counter — Drop Color even reverses.',
  },
]

const PREVIEWS = [
  {
    src: '/screens/web-solo-table.webp',
    title: 'Solo table',
    caption: 'Your turn against two CPU opponents, with the draw and discard piles in the center.',
  },
  {
    src: '/screens/web-drop-color-attack.webp',
    title: 'Drop Color attack',
    caption: 'Pick a color, then tap the opponent you want to hit.',
  },
  {
    src: '/screens/web-tutorial.webp',
    title: 'Interactive tutorial',
    caption: 'Practice each move before your first match.',
  },
]

const DECK = [
  { src: '/cards/orange-1.png', alt: 'Orange 1' },
  { src: '/cards/blue-2.png', alt: 'Blue 2' },
  { src: '/cards/green-3.png', alt: 'Green 3' },
  { src: '/cards/purple-4.png', alt: 'Purple 4' },
]

export function AboutPage() {
  return (
    <div className="syh-page syh-about">
      <section className="syh-hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="syh-hero-logo">
          <BrandLogo eager />
        </h1>
        <p className="syh-hero-tagline">{TAGLINE}</p>
        <p className="syh-page-lede syh-hero-lede">
          An original competitive card game built on one rhythm: <b>drop, resolve, pick up</b>. Build a
          scoring five-card hand while you attack, defend, and force the table to react. First to 5 points
          wins.
        </p>
        <div className="syh-hero-actions">
          <a href="/" className="syh-primary syh-link-button syh-cta">
            Play now — free in your browser
          </a>
          <a href="/?tutorial=1" className="syh-secondary syh-link-button syh-cta">
            Learn in 2 minutes
          </a>
        </div>
        <div className="syh-hero-fan" aria-hidden="true">
          {HERO_CARDS.map((card) => (
            <img key={card.src} src={card.src} alt="" width={660} height={900} />
          ))}
        </div>
        <ul className="syh-hero-facts" aria-label="Highlights">
          <li>Original 70-card deck</li>
          <li>Solo vs 1–5 CPUs</li>
          <li>Private online 1v1 beta</li>
          <li>No account needed</li>
        </ul>
      </section>

      <section className="syh-about-section" aria-labelledby="get-title">
        <h2 id="get-title">Get SHOW YOUR HAND</h2>
        <div className="syh-get-grid">
          <article className="syh-get-card">
            <span className="syh-pill is-live">Available now</span>
            <h3>Play in your browser</h3>
            <p>
              Works on iPhone, Android, and desktop browsers. No download or account. Add it to your home
              screen for an app-style window and offline solo play.
            </p>
            <a href="/" className="syh-primary syh-link-button">Play now</a>
          </article>
          <article className="syh-get-card">
            <span className="syh-pill">Coming soon</span>
            <h3>iPhone app</h3>
            <p>
              A native iPhone version with haptics, solo play, and online 1v1 is being prepared for the App
              Store. It isn’t available for download yet — check back here for the App Store link.
            </p>
          </article>
        </div>
      </section>

      <section className="syh-about-section" aria-labelledby="modes-title">
        <h2 id="modes-title">Two ways to play</h2>
        <div className="syh-mode-grid syh-mode-grid-2">
          <article>
            <span>SOLO</span>
            <h3>1–5 computer opponents</h3>
            <p>
              Fill a table of up to six. Computer players follow the same rules and declaration windows you
              do. Beginner Mode removes the turn clock, slows CPU moves, and adds guidance. Matches save
              automatically on your device.
            </p>
          </article>
          <article>
            <span>ONLINE BETA</span>
            <h3>Private 1v1 rooms</h3>
            <p>
              Create a room, share the code or invite link, ready up, and play. The game server validates
              every move and keeps your hand hidden. Reconnect to your seat after a refresh and run it back
              with a rematch.
            </p>
          </article>
        </div>
      </section>

      <section className="syh-about-section" aria-labelledby="deck-title">
        <h2 id="deck-title">An original 70-card deck</h2>
        <div className="syh-deck-layout">
          <div className="syh-deck-cards" aria-hidden="true">
            {DECK.map((card) => (
              <img key={card.src} src={card.src} alt="" width={660} height={900} loading="lazy" />
            ))}
          </div>
          <dl className="syh-deck-list">
            <div><dt>40</dt><dd>Numbered cards — orange, blue, green, and purple, 1–5, two of each</dd></div>
            <div><dt>10</dt><dd>Blank defense cards</dd></div>
            <div><dt>20</dt><dd>Specials — five each of Show Your Hand, Drop Color, Skip, and Shuffle</dd></div>
          </dl>
        </div>
        <table className="syh-score-table">
          <caption>Scoring hands — only five numbered cards score</caption>
          <thead>
            <tr><th scope="col">Hand</th><th scope="col">Points</th></tr>
          </thead>
          <tbody>
            <tr><td>1–5 in mixed colors</td><td>1</td></tr>
            <tr><td>Five of the same number</td><td>2</td></tr>
            <tr><td>Five of the same color</td><td>3</td></tr>
            <tr><td>1–5 all in one color</td><td>4</td></tr>
          </tbody>
        </table>
      </section>

      <section className="syh-about-section" aria-labelledby="specials-title">
        <h2 id="specials-title">The special cards</h2>
        <ul className="syh-special-showcase">
          {SPECIALS.map((special) => (
            <li key={special.name}>
              <img src={special.art} alt={`${special.name} card`} width={660} height={900} loading="lazy" />
              <div>
                <span className={`syh-pill ${special.role === 'Defense' ? 'is-live' : ''}`}>{special.role}</span>
                <h3>{special.name}</h3>
                <p>{special.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="syh-about-section syh-tutorial-promo" aria-labelledby="tutorial-title">
        <div>
          <h2 id="tutorial-title">New? Learn it in two minutes</h2>
          <p>
            The interactive tutorial walks you through eight short steps — dropping, picking up,
            attacking, defending with Blank, Shuffle, and declaring a scoring hand — with hands-on practice along the way. Replay it
            whenever you like, then start with Beginner Mode for a relaxed first match.
          </p>
          <a href="/?tutorial=1" className="syh-secondary syh-link-button">Start the tutorial</a>
        </div>
      </section>

      <section className="syh-about-section" aria-labelledby="preview-title">
        <h2 id="preview-title">Gameplay previews</h2>
        <p className="syh-preview-note">Real screens captured from the browser version ({APP_VERSION}).</p>
        <div className="syh-preview-scroller" tabIndex={0} role="region" aria-label="Screenshot gallery — scroll sideways for more">
          <ul className="syh-preview-grid">
            {PREVIEWS.map((preview) => (
              <li key={preview.src}>
                <figure>
                  <img
                    src={preview.src}
                    alt={`Screenshot of the ${preview.title.toLowerCase()} in the browser game`}
                    width={585}
                    height={1266}
                    loading="lazy"
                  />
                  <figcaption>
                    <b>{preview.title}</b>
                    <span>{preview.caption}</span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="syh-about-section" aria-labelledby="roadmap-title">
        <h2 id="roadmap-title">On the roadmap</h2>
        <p>
          In development and <b>not available yet</b>: Hardcore Mode, online tables for 2–6 real players,
          2v2, and public matchmaking.
        </p>
      </section>

      <section className="syh-about-section syh-about-help" aria-labelledby="help-title">
        <h2 id="help-title">Help &amp; policies</h2>
        <ul>
          <li><a href="/support">Help Center</a></li>
          <li><a href="/feedback">Contact &amp; feedback</a></li>
          <li><a href="/privacy">Privacy Policy</a></li>
          <li><a href="/terms">Terms of Use</a></li>
        </ul>
      </section>
    </div>
  )
}
