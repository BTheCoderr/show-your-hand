import { LocalDataControls } from './LocalDataControls'
import { PageIntro } from './SiteLayout'
import { POLICY_EFFECTIVE, POLICY_UPDATED } from './siteConfig'

export function PrivacyPage() {
  return (
    <div className="syh-page syh-legal">
      <PageIntro kicker="SHOW YOUR HAND" title="Privacy Policy">
        <p className="syh-legal-dates">
          <span>Effective {POLICY_EFFECTIVE}</span>
          <span>Last updated {POLICY_UPDATED}</span>
        </p>
        <p className="syh-page-lede">
          This policy explains what information the SHOW YOUR HAND browser game at
          {' '}show-your-hand.netlify.app and the SHOW YOUR HAND iPhone app handle, why, and how to delete it.
          “We” and “us” mean the SHOW YOUR HAND team.
        </p>
      </PageIntro>

      <section className="syh-legal-summary" aria-labelledby="summary-title">
        <h2 id="summary-title">The short version</h2>
        <ul>
          <li>There are no accounts, logins, ads, or in-game purchases.</li>
          <li>Neither version contains advertising, analytics, or crash-reporting SDKs, and we don’t track you across other apps or websites.</li>
          <li>Solo games, stats, and settings stay on your device.</li>
          <li>Online rooms send your chosen display name and your moves to our game server. Rooms are set to be deleted automatically after they expire.</li>
          <li>Messages you send through the contact form are stored so we can read and answer them.</li>
          <li>We don’t sell your information.</li>
        </ul>
      </section>

      <nav className="syh-help-toc" aria-label="Privacy Policy sections">
        <h2>Contents</h2>
        <ol>
          <li><a href="#device">Information stored on your device</a></li>
          <li><a href="#online">Online multiplayer</a></li>
          <li><a href="#feedback">Support and feedback messages</a></li>
          <li><a href="#technical">Technical and diagnostic information</a></li>
          <li><a href="#providers">Service providers</a></li>
          <li><a href="#use">How we use information</a></li>
          <li><a href="#retention">Data retention</a></li>
          <li><a href="#delete">Your choices and deleting data</a></li>
          <li><a href="#children">Children’s privacy</a></li>
          <li><a href="#security">Security</a></li>
          <li><a href="#changes">Changes to this policy</a></li>
          <li><a href="#contact">Contact and privacy requests</a></li>
        </ol>
      </nav>

      <section id="device" aria-labelledby="device-title">
        <h2 id="device-title">1. Information stored on your device</h2>
        <p>The game saves the following locally so it can work without an account:</p>
        <ul>
          <li><b>Saved solo match</b> — the current table, cards, and scores, so you can resume.</li>
          <li><b>Local statistics</b> — matches played, wins, rounds won, attacks, defenses, and best hand.</li>
          <li><b>Settings</b> — Beginner Mode, sound and haptics, and whether you’ve seen the tutorial prompt.</li>
          <li>
            <b>Online seat details</b> — while you’re in an online room: the room ID, room code, seat number,
            and a private room token that reconnects you to your seat.
          </li>
        </ul>
        <p>
          In the browser this data is kept in your browser’s local storage, and game files are cached for
          offline play. In the iPhone app it is kept in the app’s secure on-device storage (the iOS Keychain).
          Solo saves, stats, and settings are not sent to us. The online seat details are sent to our game
          server only to identify your seat in that room.
        </p>
      </section>

      <section id="online" aria-labelledby="online-title">
        <h2 id="online-title">2. Online multiplayer</h2>
        <p>When you create or join an online room, our game server stores:</p>
        <ul>
          <li><b>Room information</b> — a random room ID, the 6-character room code, room status and options, and created, updated, match-start, and expiry times.</li>
          <li><b>Your seat</b> — the display name you enter (up to 24 characters), your seat number, a randomly generated private room token, ready and rematch status, and when you joined and were last connected (connection heartbeats used for reconnecting).</li>
          <li><b>Gameplay</b> — the game state and moves, room and per-match statistics (such as attacks, defenses, and rounds won), and match results including the winner’s display name.</li>
        </ul>
        <p>
          This data isn’t linked to an account, email address, phone number, or advertising identifier. Your
          opponent sees your display name, connection and ready status, match stats, and only the cards the
          rules allow them to see. Please choose a nickname rather than your real name.
        </p>
        <p>
          Invite links and QR codes contain only the public room code — never your private room token.
        </p>
      </section>

      <section id="feedback" aria-labelledby="feedback-title">
        <h2 id="feedback-title">3. Support and feedback messages</h2>
        <p>
          If you use the contact form on this website (the iPhone app links to it), we receive the topic and
          platform you choose, your message, and — only if you provide them — your name, email address, and
          room code, plus the page you sent it from. Our form provider may also record technical details with
          each submission, such as your IP address, browser user agent, and referring page, to deliver
          messages and filter spam.
        </p>
        <p>We use this information only to respond to you, troubleshoot, and improve the game.</p>
      </section>

      <section id="technical" aria-labelledby="technical-title">
        <h2 id="technical-title">4. Technical and diagnostic information</h2>
        <p>
          The game itself doesn’t include crash-reporting, analytics, or advertising code. However, like any
          online service, our hosting providers automatically log technical request data — such as IP
          address, browser or device type, the page or service requested, and the time — when you load the
          website or use online play. They use these logs to deliver, secure, and troubleshoot the service.
        </p>
        <p>
          If you’ve chosen to share analytics with app developers in your iPhone settings, Apple may provide
          us with crash reports and aggregated usage statistics for the iPhone app. You can change this in
          iOS Settings → Privacy &amp; Security → Analytics &amp; Improvements.
        </p>
      </section>

      <section id="providers" aria-labelledby="providers-title">
        <h2 id="providers-title">5. Service providers</h2>
        <p>We rely on these providers, which process information on our behalf or as part of delivering the service:</p>
        <ul>
          <li>
            <b>Netlify</b> — hosts this website and receives contact-form submissions.{' '}
            <a href="https://www.netlify.com/privacy/" rel="noopener noreferrer">Netlify privacy policy</a>
          </li>
          <li>
            <b>Supabase</b> — runs the online game server and database, including the scheduled cleanup of
            expired rooms.{' '}
            <a href="https://supabase.com/privacy" rel="noopener noreferrer">Supabase privacy policy</a>
          </li>
          <li>
            <b>goQR.me (api.qrserver.com)</b> — in the browser game’s online lobby, your browser requests the
            invite QR code image from this service, which receives the invite link (room code only).{' '}
            <a href="https://goqr.me/" rel="noopener noreferrer">goQR.me</a>
          </li>
          <li>
            <b>Apple</b> — distributes the iPhone app through the App Store.{' '}
            <a href="https://www.apple.com/legal/privacy/" rel="noopener noreferrer">Apple privacy policy</a>
          </li>
        </ul>
        <p>
          We only share information with these providers as needed to run the game, and we require that
          providers handling information on our behalf protect it in a manner consistent with this policy.
          They may process data in the United States and other countries. We don’t sell personal information,
          share it for targeted advertising, or use it to track you across apps and websites.
        </p>
      </section>

      <section id="use" aria-labelledby="use-title">
        <h2 id="use-title">6. How we use information</h2>
        <p>
          Online play and the contact form are optional. By creating or joining a room, or sending a message,
          you choose to share that information for these purposes. You can stop at any time by playing solo
          and deleting your data as described below.
        </p>
        <ul>
          <li>To run solo and online matches, keep both players in sync, and reconnect you to your seat.</li>
          <li>To show room and match statistics and support rematches.</li>
          <li>To validate moves on the server, protect hidden cards, and prevent cheating or abuse.</li>
          <li>To answer support requests, fix bugs, and improve the game.</li>
        </ul>
      </section>

      <section id="retention" aria-labelledby="retention-title">
        <h2 id="retention-title">7. Data retention</h2>
        <ul>
          <li>
            <b>On your device:</b> until you delete it (see below). Starting a new solo match replaces the saved
            one, and leaving an online room removes the saved seat details.
          </li>
          <li>
            <b>Online rooms:</b> each room is set to expire 12 hours after it’s created (starting a rematch
            restarts that window). An automated job runs every hour and permanently deletes expired rooms
            together with their seats, display names, room tokens, game state, statistics, and match results.
            If you leave a room before a match starts, your seat is deleted right away; if the host leaves
            before the match starts, the whole room is deleted.
          </li>
          <li>
            <b>Support and feedback messages:</b> kept for as long as needed to respond and to track the issue,
            then deleted. You can ask us to delete a message sooner.
          </li>
          <li>
            <b>Provider logs:</b> kept by Netlify, Supabase, and Apple for the periods described in their own
            policies.
          </li>
        </ul>
      </section>

      <section id="delete" aria-labelledby="delete-title">
        <h2 id="delete-title">8. Your choices and deleting data</h2>
        <h3>Browser</h3>
        <p>
          Use the button below to delete the saved match, stats, settings, online seat token, and offline
          cache that SHOW YOUR HAND stored in this browser. You can also clear this site’s data in your browser
          settings.
        </p>
        <LocalDataControls />
        <h3>iPhone app</h3>
        <p>
          Open <b>Settings + Stats</b> and tap <b>Reset Local Stats</b>. Leaving an online room clears the
          saved seat, and finishing or replacing a solo match clears the saved game. iOS can keep an app’s
          secure-storage items on the device even after the app is deleted, so reset your stats and leave any
          online room first if you want that data gone.
        </p>
        <h3>Online and support data</h3>
        <p>
          Online room data deletes itself automatically as described above. Because there are no accounts, to
          ask us to delete room data sooner, or to access or delete a support message, send a{' '}
          <a href="/feedback?topic=privacy">privacy request</a> with the room code and display name, or the
          email address you used. Depending on where you live, you may have additional rights to access,
          correct, or delete personal information; we will honor applicable requests.
        </p>
      </section>

      <section id="children" aria-labelledby="children-title">
        <h2 id="children-title">9. Children’s privacy</h2>
        <p>
          SHOW YOUR HAND is a general-audience card game and isn’t directed at children under 13. It has no
          accounts, and we don’t knowingly collect personal information from children under 13. Online play
          only needs a nickname, and the contact form’s name and email fields are optional. If you believe a
          child has sent us personal information, <a href="/feedback?topic=privacy">contact us</a> and we will
          delete it.
        </p>
      </section>

      <section id="security" aria-labelledby="security-title">
        <h2 id="security-title">10. Security</h2>
        <p>
          The website and game server use encrypted HTTPS connections. Online moves are validated on the
          server, players only receive the cards they’re allowed to see, and the database tables can’t be
          read directly by the public. Keep your private room token to yourself. No system is perfectly
          secure, so please don’t put sensitive information in display names or messages.
        </p>
      </section>

      <section id="changes" aria-labelledby="changes-title">
        <h2 id="changes-title">11. Changes to this policy</h2>
        <p>
          If we change how SHOW YOUR HAND handles information — for example, if we add accounts or new
          services — we’ll update this page and the “Last updated” date before the change takes effect.
        </p>
      </section>

      <section id="contact" aria-labelledby="contact-title">
        <h2 id="contact-title">12. Contact and privacy requests</h2>
        <p>
          Send questions or requests through our <a href="/feedback?topic=privacy">contact form</a> and choose
          “Privacy or data request.” Include an email address so we can reply. You can also visit the{' '}
          <a href="/support">Help Center</a>.
        </p>
      </section>
    </div>
  )
}
