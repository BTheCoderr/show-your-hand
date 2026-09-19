type Props = {
  opponentCount: 1 | 2 | 3 | 4 | 5
  testMode: boolean
  hasSave: boolean
  onCount: (count: 1 | 2 | 3 | 4 | 5) => void
  onTestMode: (value: boolean) => void
  onStart: () => void
  onResume: () => void
  onRules: () => void
}

export function StartScreen({
  opponentCount,
  testMode,
  hasSave,
  onCount,
  onTestMode,
  onStart,
  onResume,
  onRules,
}: Props) {
  return (
    <section className="syh-start">
      <p className="syh-kicker">Playable solo match</p>
      <h1>SHOW YOUR HAND</h1>
      <p className="syh-lede">
        One human, one to five computer opponents — 2 to 6 players around one table. No account. First to 5 points wins.
      </p>
      <fieldset>
        <legend>Players</legend>
        <div className="syh-count">
          {([1, 2, 3, 4, 5] as const).map((count) => (
            <button
              key={count}
              type="button"
              className={opponentCount === count ? 'is-on' : ''}
              onClick={() => onCount(count)}
            >
              {count + 1}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="syh-check">
        <input
          type="checkbox"
          checked={testMode}
          onChange={(event) => onTestMode(event.target.checked)}
        />
        Test mode — reveal all hands and show the 70-card count
      </label>
      <div className="syh-start-actions">
        <button type="button" className="syh-primary" data-testid="start-game" onClick={onStart}>
          Start Game
        </button>
        {hasSave ? (
          <button type="button" className="syh-secondary" onClick={onResume}>
            Resume match
          </button>
        ) : null}
        <button type="button" className="syh-text-btn" onClick={onRules}>
          Rules
        </button>
      </div>
    </section>
  )
}
