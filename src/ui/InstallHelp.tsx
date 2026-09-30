type Props = {
  open: boolean
  onClose: () => void
}

export function InstallHelp({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="syh-modal syh-install-modal" role="dialog" aria-modal="true" aria-labelledby="install-title">
      <section className="syh-modal-card syh-install-card">
        <p className="syh-kicker">Install the beta</p>
        <h2 id="install-title">ADD SHOW YOUR HAND TO YOUR HOME SCREEN</h2>
        <div className="syh-install-steps">
          <article>
            <b>iPhone / iPad</b>
            <span>Open the game in Safari, tap Share, then choose Add to Home Screen.</span>
          </article>
          <article>
            <b>Android / desktop</b>
            <span>Open your browser menu and choose Install App or Add to Home Screen.</span>
          </article>
        </div>
        <p className="syh-note">
          Once installed, SHOW YOUR HAND opens in its own app-style window. Previously loaded solo
          assets remain available offline.
        </p>
        <button type="button" className="syh-primary" onClick={onClose}>Got it</button>
      </section>
    </div>
  )
}
