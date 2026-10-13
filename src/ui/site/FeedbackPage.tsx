import { FeedbackForm } from './FeedbackForm'
import { PageIntro } from './SiteLayout'

export function FeedbackPage() {
  return (
    <div className="syh-page syh-feedback-page">
      <PageIntro kicker="Contact & feedback" title="Help improve SHOW YOUR HAND">
        <p className="syh-page-lede">
          Report a bug, ask for help, or tell us what felt confusing, slow, unfair, fun, or broken. Add your
          email if you’d like a reply, and include the room code only if it helps explain an online issue.
        </p>
        <p className="syh-page-lede">
          Looking for quick answers? Visit the <a href="/support">Help Center</a>.
        </p>
      </PageIntro>
      <FeedbackForm page="feedback" />
    </div>
  )
}
