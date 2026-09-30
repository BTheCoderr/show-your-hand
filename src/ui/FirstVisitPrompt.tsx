type Props = {
  open: boolean
  onTutorial: () => void
  onSkip: () => void
}

export function FirstVisitPrompt({ open, onTutorial, onSkip }: Props) {
  if (!open) return null

  return (
    <div className="syh-modal syh-welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <section className="syh-welcome-card">
        <div className="syh-welcome-cards" aria-hidden="true">
          <img src="/cards/show-your-hand.png" alt="" />
          <img src="/cards/back.png" alt="" />
          <img src="/cards/shuffle.png" alt="" />
        </div>
        <p className="syh-kicker">New to the table?</p>
        <h2 id="welcome-title">LEARN SHOW YOUR HAND IN 2 MINUTES</h2>
        <p>
          Learn the turn flow, attacks, defense, Shuffle, and how to score before your first match.
        </p>
        <div className="syh-welcome-actions">
          <button type="button" className="syh-primary" onClick={onTutorial}>
            Take the tutorial
          </button>
          <button type="button" className="syh-secondary" onClick={onSkip}>
            Skip for now
          </button>
        </div>
        <small>You can replay the tutorial from the top menu anytime.</small>
      </section>
    </div>
  )
}
