import type { ReactNode } from 'react'
import { FeedbackForm } from './FeedbackForm'
import { PageIntro } from './SiteLayout'

const SECTIONS = [
  { id: 'getting-started', label: 'Getting started' },
  { id: 'rules', label: 'Rules & special cards' },
  { id: 'solo', label: 'Solo play' },
  { id: 'online', label: 'Online multiplayer' },
  { id: 'invites', label: 'Invite links & room codes' },
  { id: 'reconnect', label: 'Reconnecting & saved games' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'install', label: 'Install & update' },
  { id: 'contact', label: 'Contact support' },
] as const

function Faq({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="syh-faq">
      <summary>{question}</summary>
      <div className="syh-faq-body">{children}</div>
    </details>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="syh-help-section" id={id} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      {children}
    </section>
  )
}

const SPECIALS = [
  {
    art: '/cards/show-your-hand.png',
    name: 'Show Your Hand',
    effect: 'Choose an opponent. Their hand is revealed to everyone until the current turn ends.',
    defense: 'Only a Blank blocks it.',
  },
  {
    art: '/cards/drop-color.png',
    name: 'Drop Color',
    effect: 'Name a color. The target drops every numbered card of that color, and you may claim the dropped cards.',
    defense: 'Block with a Blank, or counter with your own Drop Color to reverse it — you then name a color for the attacker, who can still answer with a Blank.',
  },
  {
    art: '/cards/skip.png',
    name: 'Skip',
    effect: 'The next opponent loses their upcoming turn.',
    defense: 'A Blank or a matching Skip cancels it. The defender then takes their normal turn.',
  },
  {
    art: '/cards/shuffle.png',
    name: 'Shuffle',
    effect: 'Choose one or two opponents. Their hands go back into the deck and they are dealt fresh cards.',
    defense: 'A Blank protects only you. A matching Shuffle protects you and adds the attacker to the shuffle.',
  },
  {
    art: '/cards/blank.png',
    name: 'Blank',
    effect: 'The defense card. Play it when you are targeted to cancel the attack against you.',
    defense: 'Blanks never count toward a scoring hand.',
  },
]

export function SupportPage() {
  return (
    <div className="syh-page syh-support">
      <PageIntro kicker="SHOW YOUR HAND support" title="Help Center">
        <p className="syh-page-lede">
          Answers for the browser game and the iPhone app — rules, solo and online play, invite codes,
          reconnecting, saved games, and installing updates. Can’t find what you need?{' '}
          <a href="#contact">Contact support</a>.
        </p>
      </PageIntro>

      <ul className="syh-help-actions" aria-label="Quick help actions">
        <li>
          <a href="/feedback?topic=bug">
            <b>Report a bug</b>
            <span>Something broke, froze, or scored wrong</span>
          </a>
        </li>
        <li>
          <a href="#contact">
            <b>Contact support</b>
            <span>Ask a question about your game</span>
          </a>
        </li>
        <li>
          <a href="/feedback?topic=feedback">
            <b>Submit feedback</b>
            <span>Ideas, confusing moments, what you loved</span>
          </a>
        </li>
        <li>
          <a href="/feedback?topic=privacy">
            <b>Privacy request</b>
            <span>Questions about or deletion of your data</span>
          </a>
        </li>
      </ul>

      <nav className="syh-help-toc" aria-label="Help topics">
        <h2>Help topics</h2>
        <ul>
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="getting-started" title="Getting started">
        <Faq question="What is SHOW YOUR HAND?">
          <p>
            SHOW YOUR HAND is an original competitive card game played with a custom 70-card deck. Every
            turn follows one rhythm — <b>drop, resolve, pick up</b> — while you build a scoring five-card
            hand and use special cards to attack and defend. The first player to 5 points wins.
          </p>
        </Faq>
        <Faq question="Do I need an account?">
          <p>
            No. There are no accounts or logins. Solo games run entirely on your device. Online rooms only
            ask for a display name for that table.
          </p>
        </Faq>
        <Faq question="How do I learn to play?">
          <p>
            Open the 2-minute interactive tutorial: tap <b>How to Play</b> on the start screen of the browser
            game or the iPhone home screen. It walks you through dropping a card, attacks,
            defense, Shuffle, and scoring with practice steps. You can replay it any time.
          </p>
          <p>
            For your first matches, turn on <b>Beginner Mode</b>: no turn clock, slower computer moves, and
            extra guidance.
          </p>
        </Faq>
      </Section>

      <Section id="rules" title="Rules & special cards">
        <Faq question="How does a turn work?">
          <p>
            Everyone holds five cards. On your turn, play one special card or discard one card, then everyone
            draws back to five. Before you drop, you may pick up the top <em>numbered</em> card from the
            discard pile; you then drop one card to get back to five.
          </p>
        </Faq>
        <Faq question="How does scoring work?">
          <p>
            Only five numbered cards can score; special cards and Blanks never count. When you hold a scoring
            hand, press <b>Declare Hand</b>. Only your highest qualifying combination scores:
          </p>
          <table className="syh-score-table">
            <caption className="syh-visually-hidden">Scoring hands</caption>
            <thead>
              <tr><th scope="col">Hand</th><th scope="col">Points</th></tr>
            </thead>
            <tbody>
              <tr><td>1–5 in mixed colors</td><td>1</td></tr>
              <tr><td>Five cards of the same number</td><td>2</td></tr>
              <tr><td>Five cards of the same color</td><td>3</td></tr>
              <tr><td>1–5 all in one color</td><td>4</td></tr>
            </tbody>
          </table>
          <p>The first player to reach 5 points wins the match. All 70 cards are collected and redealt between rounds.</p>
        </Faq>
        <Faq question="What do the special cards do?">
          <ul className="syh-help-specials">
            {SPECIALS.map((special) => (
              <li key={special.name}>
                <img src={special.art} alt="" width={66} height={90} loading="lazy" />
                <div>
                  <b>{special.name}</b>
                  <p>{special.effect}</p>
                  <p className="syh-help-defense">{special.defense}</p>
                </div>
              </li>
            ))}
          </ul>
        </Faq>
        <Faq question="What’s in the 70-card deck?">
          <p>
            40 numbered cards (orange, blue, green, and purple, 1–5, two copies each), 10 Blank, and five each
            of Show Your Hand, Drop Color, Skip, and Shuffle.
          </p>
        </Faq>
        <Faq question="Where can I read the full rules?">
          <p>
            In the browser game, tap <b>Rules</b> on the start screen or in the top menu during a match. In the
            iPhone app, the <b>How to Play</b> tutorial covers every card and scoring hand. This page also
            summarizes the rules above.
          </p>
        </Faq>
      </Section>

      <Section id="solo" title="Solo play">
        <Faq question="How many opponents can I play against?">
          <p>
            Choose 1 to 5 computer opponents (2–6 players at the table). Computer players follow the same
            rules and get the same declaration windows you do.
          </p>
        </Faq>
        <Faq question="Is there a turn timer?">
          <p>
            Standard solo games show a 2-minute turn clock. Turn on Beginner Mode to remove the clock.
          </p>
        </Faq>
        <Faq question="Can I play solo offline?">
          <p>
            Yes. The iPhone app plays solo without a connection. In the browser, solo play keeps working
            offline after the game has fully loaded once on that device. Online rooms always need an internet
            connection.
          </p>
        </Faq>
        <Faq question="Where are my stats?">
          <p>
            Solo stats (matches, wins, rounds, attacks, best hand) are stored only on the device and browser
            you play on. They don’t sync between devices. On iPhone you can reset them in <b>Settings + Stats</b>; in
            the browser you can clear them from the <a href="/privacy#delete">Privacy page</a>.
          </p>
        </Faq>
      </Section>

      <Section id="online" title="Online multiplayer">
        <Faq question="What online modes are available?">
          <p>
            Online play is currently a <b>private 1v1 beta</b>: one host and one invited player. Public
            matchmaking and larger online tables are not available yet.
          </p>
        </Faq>
        <Faq question="How do I start an online match?">
          <ol>
            <li>Tap <b>Play Online</b> (browser) or <b>Online 1v1</b> (iPhone), enter a display name, and create a room.</li>
            <li>Share the room code or invite link with your opponent.</li>
            <li>Both players tap <b>Ready</b>. The host can switch Beginner Mode on or off before starting.</li>
            <li>The host starts the match. First to 5 points wins.</li>
          </ol>
          <p>After a match, both players can request a rematch in the same room.</p>
        </Faq>
        <Faq question="Can my opponent see my cards?">
          <p>
            No. Online games are run by the game server, which checks every move and only sends each player
            the cards they’re allowed to see — unless a Show Your Hand card reveals them, or a winning hand is
            shown at the end of a round.
          </p>
        </Faq>
        <Faq question="What should I use as a display name?">
          <p>
            Display names are shown to your opponent. Use a nickname (up to 24 characters) and avoid personal
            details like your full name, phone number, or email.
          </p>
        </Faq>
      </Section>

      <Section id="invites" title="Invite links & room codes">
        <Faq question="What does a room code look like?">
          <p>
            Room codes are 6 characters using the digits 0–9 and letters A–F (for example <code>3FA9C2</code>).
            Invite links look like <code>show-your-hand.netlify.app/join/3FA9C2</code>.
          </p>
        </Faq>
        <Faq question="“Room not found or no longer joinable”">
          <p>This usually means one of the following:</p>
          <ul>
            <li>The code was mistyped — double-check letters A–F versus similar-looking characters.</li>
            <li>The match has already started. Rooms can only be joined while they’re waiting for players.</li>
            <li>The room expired. Rooms close automatically about 12 hours after they’re created.</li>
          </ul>
          <p>Ask the host to create a fresh room and share the new code.</p>
        </Faq>
        <Faq question="“Room is full”">
          <p>Online rooms seat two players. If someone else joined first, ask the host for a new room.</p>
        </Faq>
        <Faq question="Is it safe to share an invite link?">
          <p>
            Yes. Invite links only contain the public room code. Your private seat token stays on your device
            and is never part of the link — don’t share it or screenshots of developer tools.
          </p>
        </Faq>
        <Faq question="I’m using the iPhone app — how do I join?">
          <p>
            Open <b>Online 1v1</b> in the app and type the room code. Invite links open the browser version of the
            game.
          </p>
        </Faq>
      </Section>

      <Section id="reconnect" title="Reconnecting & saved games">
        <Faq question="I refreshed or closed the game during an online match">
          <p>
            Reopen the game on the <b>same device and browser</b> (or the same iPhone app). It reconnects you
            to your seat automatically using the token saved on that device. Private or incognito browsing
            windows may forget the token when closed.
          </p>
        </Faq>
        <Faq question="My opponent disconnected">
          <p>
            You’ll see a reconnect message with a 60-second grace window. If they don’t return in time, the
            table closes and the match ends. You can then start a new room.
          </p>
        </Faq>
        <Faq question="Where is my saved solo game?">
          <p>
            Solo matches save automatically on your device. Choose <b>Resume match</b> on the start screen
            (browser) or from the solo setup screen (iPhone). Only one solo match is saved at a time — starting
            a new one replaces it.
          </p>
        </Faq>
        <Faq question="My saved game or stats disappeared">
          <p>
            Saves and stats live only on the device. They’re removed if you clear your browser’s site data,
            use a private window, switch browsers or devices, or delete the app. We can’t restore them because
            they are never sent to us.
          </p>
        </Faq>
      </Section>

      <Section id="troubleshooting" title="Gameplay troubleshooting">
        <Faq question="My card won’t play">
          <ul>
            <li>Make sure it’s your turn — your seat is highlighted and the banner says “Your turn.”</li>
            <li>Swipe the card firmly upward to play or discard it.</li>
            <li>To pick up, drag the top numbered discard down toward your hand. Specials and Blanks on the discard pile can’t be picked up.</li>
            <li>Attack cards guide you to choose a target (and a color for Drop Color) before they resolve.</li>
          </ul>
        </Faq>
        <Faq question="The game seems stuck">
          <p>
            Read the instruction banner above the table — the game may be waiting for you to choose a target,
            answer a defense prompt, claim dropped cards, or discard extras. In the browser, refreshing is
            safe: solo games resume, and online games reconnect to your seat.
          </p>
        </Faq>
        <Faq question="“Online request timed out”">
          <p>
            The game couldn’t reach the server within 12 seconds. Check your Wi-Fi or mobile data and try
            again. During a match, reconnect within 60 seconds — after that the table closes.
          </p>
        </Faq>
        <Faq question="No sound or vibration">
          <p>
            Check that <b>Sound + Haptics</b> (browser) or <b>Haptic Feedback</b> (iPhone app, Settings + Stats) is on.
            Some browsers don’t support vibration, and iPhone system settings can turn off haptics.
          </p>
        </Faq>
        <Faq question="Something scored wrong or looked like a rules bug">
          <p>
            Please <a href="/feedback?topic=bug">report it</a> with the cards in each hand, what you expected,
            and the room code if it happened online.
          </p>
        </Faq>
      </Section>

      <Section id="install" title="Install & update">
        <Faq question="Play in a browser">
          <p>
            No download is needed — open <a href="/">show-your-hand.netlify.app</a> in a current version of
            Safari, Chrome, Edge, or Firefox.
          </p>
        </Faq>
        <Faq question="Add the browser game to your home screen">
          <ul>
            <li><b>iPhone / iPad:</b> open the game in Safari, tap Share, then choose <b>Add to Home Screen</b>.</li>
            <li><b>Android / desktop:</b> open your browser menu and choose <b>Install App</b> or <b>Add to Home Screen</b>.</li>
          </ul>
        </Faq>
        <Faq question="The iPhone app">
          <p>
            The native iPhone app is being prepared for the App Store and is not available for public download
            yet. Once it’s released, install it from the App Store and keep it current from the App Store’s
            updates list, or turn on automatic app updates in <b>Settings → App Store</b>.
          </p>
        </Faq>
        <Faq question="The browser game looks out of date">
          <p>
            Updates install automatically. If you still see an old version, close every SHOW YOUR HAND tab
            (or the home-screen app) and open it again.
          </p>
        </Faq>
      </Section>

      <Section id="contact" title="Contact support">
        <p>
          Send us a message with the form below — choose a topic so it reaches the right place. Add your
          email if you’d like a reply. For online issues, include the room code.
        </p>
        <FeedbackForm page="support" headingLevel={3} />
        <p className="syh-help-legal">
          Read our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Use</a>.
        </p>
      </Section>
    </div>
  )
}
