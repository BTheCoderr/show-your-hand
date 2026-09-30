import type { LocalStats } from '../game/stats'

type Props = {
  opponentCount: 1 | 2 | 3 | 4 | 5
  testMode: boolean
  beginnerMode: boolean
  feedbackEnabled: boolean
  version: string
  stats: LocalStats
  hasSave: boolean
  onCount: (count: 1 | 2 | 3 | 4 | 5) => void
  onTestMode: (value: boolean) => void
  onBeginnerMode: (value: boolean) => void
  onFeedback: (value: boolean) => void
  onStart: () => void
  onResume: () => void
  onRules: () => void
  onTutorial: () => void
  onOnline: () => void
}

export function StartScreen({
  opponentCount,
  testMode,
  beginnerMode,
  feedbackEnabled,
  version,
  stats,
  hasSave,
  onCount,
  onTestMode,
  onBeginnerMode,
  onFeedback,
  onStart,
  onResume,
  onRules,
  onTutorial,
  onOnline,
}: Props) {
  return (
    <section className="syh-start">
      <div className="syh-start-title-row">
        <div>
          <p className="syh-kicker">Solo + online 1v1</p>
          <h1>SHOW YOUR HAND</h1>
        </div>
        <span className="syh-version">{version}</span>
      </div>
      <p className="syh-lede">
        Play solo against one to five computer opponents, or open a private 1v1 room on two devices. First to 5 points wins.
      </p>

      <div className="syh-local-stats" aria-label="Local player stats">
        <div><span>Matches</span><b>{stats.matchesPlayed}</b></div>
        <div><span>Wins</span><b>{stats.wins}</b></div>
        <div><span>Rounds</span><b>{stats.roundsWon}</b></div>
        <div><span>Attacks</span><b>{stats.attacksPlayed}</b></div>
        <div><span>Best hand</span><b>{stats.bestHandPoints} pts</b></div>
      </div>

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

      <div className="syh-start-settings">
        <div className="syh-mode-card">
          <div>
            <strong>Beginner Mode</strong>
            <span>No turn clock · slower CPU moves · extra guidance</span>
          </div>
          <button
            type="button"
            className={`syh-mode-toggle ${beginnerMode ? 'is-on' : ''}`}
            aria-pressed={beginnerMode}
            onClick={() => onBeginnerMode(!beginnerMode)}
          >
            {beginnerMode ? 'On' : 'Off'}
          </button>
        </div>

        <div className="syh-mode-card">
          <div>
            <strong>Sound + Haptics</strong>
            <span>Card, attack, defense, scoring, and win feedback</span>
          </div>
          <button
            type="button"
            className={`syh-mode-toggle ${feedbackEnabled ? 'is-on' : ''}`}
            aria-pressed={feedbackEnabled}
            onClick={() => onFeedback(!feedbackEnabled)}
          >
            {feedbackEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </div>

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
          Start Solo Game
        </button>
        <button type="button" className="syh-secondary syh-online-cta" onClick={onOnline}>
          Play Online
          <span>1v1 beta</span>
        </button>
        {hasSave ? (
          <button type="button" className="syh-secondary" onClick={onResume}>
            Resume match
          </button>
        ) : null}
        <button type="button" className="syh-secondary syh-tutorial-cta" onClick={onTutorial}>
          How to Play
          <span>2 min</span>
        </button>
        <button type="button" className="syh-text-btn" onClick={onRules}>
          Rules
        </button>
      </div>

      <footer className="syh-product-footer">
        <span>SHOW YOUR HAND · {version}</span>
        <nav aria-label="Product links">
          <a href="/about">About</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/feedback">Feedback</a>
        </nav>
      </footer>
    </section>
  )
}
