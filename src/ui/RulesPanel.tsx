import { RULES_TEXT } from '../game/defaults'

type Props = {
  open: boolean
  onClose: () => void
}

export function RulesPanel({ open, onClose }: Props) {
  if (!open) return null
  return (
    <div className="syh-modal" role="dialog" aria-labelledby="rules-title">
      <div className="syh-modal-card syh-rules">
        <header>
          <h2 id="rules-title">Playtest Rules v0.1</h2>
          <button type="button" className="syh-text-btn" onClick={onClose}>
            Close
          </button>
        </header>
        <p className="syh-note">
          Established design is locked. The list below also records the configurable playtest
          defaults used by this solo build.
        </p>
        <h3>Established</h3>
        <ul>
          {RULES_TEXT.established.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <h3>Playtest defaults in this build</h3>
        <ul>
          {RULES_TEXT.provisional.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
