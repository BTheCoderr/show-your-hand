import { PageIntro } from './SiteLayout'
import { POLICY_EFFECTIVE, POLICY_UPDATED } from './siteConfig'

export function TermsPage() {
  return (
    <div className="syh-page syh-legal">
      <PageIntro kicker="SHOW YOUR HAND" title="Terms of Use">
        <p className="syh-legal-dates">
          <span>Effective {POLICY_EFFECTIVE}</span>
          <span>Last updated {POLICY_UPDATED}</span>
        </p>
        <p className="syh-page-lede">
          These terms apply to the SHOW YOUR HAND browser game at show-your-hand.netlify.app and the SHOW YOUR
          HAND iPhone app (together, “the game”). By playing, you agree to them.
        </p>
      </PageIntro>

      <section aria-labelledby="t-beta">
        <h2 id="t-beta">1. A game in active development</h2>
        <p>
          SHOW YOUR HAND is in beta. Rules, features, and presentation may change. Online rooms may be reset or
          closed, and the service may sometimes be unavailable or contain bugs. Online rooms expire
          automatically, and solo progress is stored only on your device, so we can’t restore lost games or
          stats.
        </p>
      </section>

      <section aria-labelledby="t-play">
        <h2 id="t-play">2. Fair play and conduct</h2>
        <p>When you use the game, don’t:</p>
        <ul>
          <li>cheat, exploit bugs, or try to see hidden cards or another player’s room token;</li>
          <li>disrupt rooms, flood the service with automated traffic, or interfere with servers or other players;</li>
          <li>impersonate others or use display names that are hateful, harassing, sexually explicit, or include someone’s personal information;</li>
          <li>reverse engineer or copy the game except where the law expressly allows it.</li>
        </ul>
        <p>We may remove rooms or block access to protect players and the service.</p>
      </section>

      <section aria-labelledby="t-content">
        <h2 id="t-content">3. Display names and messages</h2>
        <p>
          You’re responsible for the display names and messages you submit. If you send feedback or ideas, you
          allow us to use them to improve the game without owing you anything.
        </p>
      </section>

      <section aria-labelledby="t-ip">
        <h2 id="t-ip">4. Our content</h2>
        <p>
          The SHOW YOUR HAND name, logo, game design, rules, card art, and software are protected by
          intellectual-property laws. You may play the game for personal, non-commercial entertainment. These
          terms don’t give you any other rights to that content.
        </p>
      </section>

      <section aria-labelledby="t-apple">
        <h2 id="t-apple">5. The iPhone app</h2>
        <p>
          If you download the iPhone app from the App Store, Apple’s{' '}
          <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" rel="noopener noreferrer">
            Standard Licensed Application End User License Agreement
          </a>{' '}
          also applies. Apple isn’t responsible for the app or its support — please contact us through the{' '}
          <a href="/support">Help Center</a>.
        </p>
      </section>

      <section aria-labelledby="t-privacy">
        <h2 id="t-privacy">6. Privacy</h2>
        <p>
          Our <a href="/privacy">Privacy Policy</a> explains what information the game handles and how to delete
          it.
        </p>
      </section>

      <section aria-labelledby="t-warranty">
        <h2 id="t-warranty">7. Disclaimer</h2>
        <p>
          The game is provided “as is” and “as available,” without warranties of any kind, to the fullest extent
          permitted by law. We don’t promise that it will always be available, error-free, or that saved data
          will be preserved.
        </p>
      </section>

      <section aria-labelledby="t-liability">
        <h2 id="t-liability">8. Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, we aren’t liable for indirect, incidental, or consequential
          damages, or for lost games, stats, or data, arising from your use of the game. Nothing in these terms
          limits rights you have under consumer-protection laws that can’t be waived.
        </p>
      </section>

      <section aria-labelledby="t-changes">
        <h2 id="t-changes">9. Changes</h2>
        <p>
          We may update these terms as the game evolves. We’ll change the “Last updated” date above, and
          continuing to play means you accept the updated terms.
        </p>
      </section>

      <section aria-labelledby="t-contact">
        <h2 id="t-contact">10. Contact</h2>
        <p>
          Questions about these terms? Reach us through the <a href="/support#contact">Help Center contact form</a>.
        </p>
      </section>
    </div>
  )
}
