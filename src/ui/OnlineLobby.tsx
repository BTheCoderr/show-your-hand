import { useEffect, useMemo, useState } from 'react'
import { joinUrl, type OnlineRoom, type OnlineSession } from '../online/rooms'

type Props = {
  open: boolean
  configured: boolean
  session: OnlineSession | null
  room: OnlineRoom | null
  busy: boolean
  error: string | null
  initialCode?: string | null
  onClose: () => void
  onCreate: (name: string) => void
  onJoin: (code: string, name: string) => void
  onReady: (ready: boolean) => void
  onOptions: (options: { beginnerMode: boolean; mode: 'standard' | 'hardcore' }) => void
  onStart: () => void
  onRematch: (ready: boolean) => void
  onNewOpponent: () => void
  onLeave: () => void
}

export function OnlineLobby({
  open,
  configured,
  session,
  room,
  busy,
  error,
  initialCode,
  onClose,
  onCreate,
  onJoin,
  onReady,
  onOptions,
  onStart,
  onRematch,
  onNewOpponent,
  onLeave,
}: Props) {
  const [name, setName] = useState('Player')
  const [code, setCode] = useState(initialCode ?? '')
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  useEffect(() => {
    if (initialCode) setCode(initialCode)
  }, [initialCode])

  const shareLink = useMemo(() => (session ? joinUrl(session.roomCode) : ''), [session?.roomCode])
  const qrSrc = shareLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(shareLink)}`
    : ''

  if (!open) return null

  const copy = async (kind: 'code' | 'link', value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 1400)
    } catch {
      setCopied(null)
    }
  }

  const self = room?.players.find((player) => player.gamePlayerId === session?.gamePlayerId)
  const bothReady = Boolean(room && room.players.length === 2 && room.players.every((player) => player.ready))
  const opponent = room?.players.find((player) => player.gamePlayerId !== session?.gamePlayerId)

  return (
    <div className="syh-modal syh-online-modal" role="dialog" aria-modal="true" aria-labelledby="online-title">
      <section className="syh-online-card">
        <header>
          <div>
            <p className="syh-kicker">Private multiplayer beta</p>
            <h2 id="online-title">PLAY ONLINE · 1V1</h2>
          </div>
          {!session ? (
            <button type="button" className="syh-text-btn" onClick={onClose}>
              Close
            </button>
          ) : null}
        </header>

        {!configured ? (
          <div className="syh-online-message">
            Online play is unavailable in this build.
          </div>
        ) : null}

        {configured && !session ? (
          <>
            {initialCode ? (
              <p className="syh-online-invite-banner">
                You were invited to room <b>{initialCode}</b>. Enter your table name and join.
              </p>
            ) : null}

            <label className="syh-online-field">
              <span>Your table name</span>
              <input
                value={name}
                maxLength={24}
                onChange={(event) => setName(event.target.value)}
                placeholder="Player"
                autoComplete="nickname"
              />
            </label>

            <div className="syh-online-choice">
              <article>
                <h3>Host a table</h3>
                <p>Create a private room, send the invite link or QR code, then both players ready up.</p>
                <button
                  type="button"
                  className="syh-primary"
                  disabled={busy || !name.trim()}
                  onClick={() => onCreate(name.trim())}
                >
                  {busy ? 'Creating…' : 'Create room'}
                </button>
              </article>

              <article>
                <h3>Join a table</h3>
                <p>Open an invite link or enter the host’s six-character code.</p>
                <input
                  value={code}
                  maxLength={6}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/[^a-fA-F0-9]/g, '').toUpperCase())
                  }
                  placeholder="A1B2C3"
                  aria-label="Room code"
                />
                <button
                  type="button"
                  className="syh-secondary"
                  disabled={busy || code.length !== 6 || !name.trim()}
                  onClick={() => onJoin(code, name.trim())}
                >
                  {busy ? 'Joining…' : 'Join room'}
                </button>
              </article>
            </div>
          </>
        ) : null}

        {configured && session ? (
          <div className="syh-online-room">
            <div className="syh-room-code">
              <span>ROOM CODE</span>
              <strong>{session.roomCode}</strong>
              <button type="button" className="syh-text-btn" onClick={() => void copy('code', session.roomCode)}>
                {copied === 'code' ? 'Copied' : 'Copy code'}
              </button>
            </div>

            {room?.status === 'waiting' ? (
              <div className="syh-invite-panel">
                <div>
                  <span>INVITE LINK</span>
                  <b>{shareLink.replace(/^https?:\/\//, '')}</b>
                  <button type="button" className="syh-secondary" onClick={() => void copy('link', shareLink)}>
                    {copied === 'link' ? 'Link copied' : 'Copy invite link'}
                  </button>
                </div>
                <img src={qrSrc} alt={`QR code to join room ${session.roomCode}`} />
              </div>
            ) : null}

            <div className="syh-online-settings">
              <div>
                <span>MODE</span>
                <strong>Standard</strong>
                <small>Hardcore mode is next.</small>
              </div>
              <div>
                <span>BEGINNER MODE</span>
                <button
                  type="button"
                  className={`syh-mode-toggle ${room?.beginnerMode ? 'is-on' : ''}`}
                  disabled={!session.isHost || room?.status !== 'waiting' || busy}
                  onClick={() =>
                    onOptions({
                      beginnerMode: !room?.beginnerMode,
                      mode: 'standard',
                    })
                  }
                >
                  {room?.beginnerMode ? 'On' : 'Off'}
                </button>
                <small>{session.isHost ? 'Host controls this setting.' : 'Set by host.'}</small>
              </div>
            </div>

            <div className="syh-online-players">
              <h3>At the table</h3>
              {(room?.players ?? []).map((player) => (
                <div key={player.id} className={!player.connected ? 'is-disconnected' : ''}>
                  <span className="syh-online-seat">{player.seat === 0 ? 'HOST' : 'GUEST'}</span>
                  <b>{player.displayName}</b>
                  <span className={`syh-connection-dot ${player.connected ? 'is-online' : 'is-offline'}`}>
                    {player.connected ? 'Connected' : 'Reconnecting…'}
                  </span>
                  {player.ready && room?.status === 'waiting' ? <em>READY</em> : null}
                  {player.rematchReady && room?.status === 'completed' ? <em>REMATCH ✓</em> : null}
                  {player.gamePlayerId === session.gamePlayerId ? <em>You</em> : null}
                </div>
              ))}
              {!room || room.players.length < 2 ? (
                <div className="syh-online-waiting">
                  <span className="syh-online-pulse" />
                  Waiting for Player 2…
                </div>
              ) : null}
            </div>

            {room?.status === 'waiting' ? (
              <>
                <button
                  type="button"
                  className={`syh-secondary syh-ready-button ${self?.ready ? 'is-ready' : ''}`}
                  disabled={busy}
                  onClick={() => onReady(!self?.ready)}
                >
                  {self?.ready ? '✓ Ready' : 'I’m ready'}
                </button>

                {session.isHost ? (
                  <button
                    type="button"
                    className="syh-primary syh-online-start"
                    disabled={busy || !bothReady}
                    onClick={onStart}
                  >
                    {bothReady ? 'Start online match' : 'Both players must be ready'}
                  </button>
                ) : (
                  <p className="syh-online-message">
                    {self?.ready
                      ? 'Ready. Waiting for the host to start.'
                      : 'Ready up when you’re set to play.'}
                  </p>
                )}
              </>
            ) : null}

            {room?.status === 'completed' ? (
              <>
                <div className="syh-match-results">
                  <h3>Match stats</h3>
                  <div className="syh-match-results-grid">
                    {(room.players ?? []).map((player) => (
                      <article key={player.id}>
                        <header>
                          <b>{player.displayName}</b>
                          {player.gamePlayerId === session.gamePlayerId ? <em>You</em> : null}
                        </header>
                        <dl>
                          <div><dt>Rounds won</dt><dd>{player.stats.roundsWon}</dd></div>
                          <div><dt>Attacks</dt><dd>{player.stats.attacksPlayed}</dd></div>
                          <div><dt>Defenses</dt><dd>{player.stats.defensesPlayed}</dd></div>
                          <div><dt>Blank saves</dt><dd>{player.stats.blankDefenses}</dd></div>
                        </dl>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="syh-rematch-panel">
                  <h3>Run it back?</h3>
                  <p>
                    {opponent?.rematchReady
                      ? `${opponent.displayName} wants a rematch.`
                      : 'Both players can stay at this table and rematch without a new code.'}
                  </p>
                  <div className="syh-post-match-actions">
                    <button
                      type="button"
                      className={`syh-primary ${self?.rematchReady ? 'is-ready' : ''}`}
                      disabled={busy}
                      onClick={() => onRematch(!self?.rematchReady)}
                    >
                      {self?.rematchReady ? 'Rematch requested ✓' : 'Rematch'}
                    </button>
                    <button
                      type="button"
                      className="syh-secondary"
                      disabled={busy}
                      onClick={onNewOpponent}
                    >
                      New opponent
                    </button>
                  </div>
                </div>
              </>
            ) : null}

            {room?.status === 'abandoned' ? (
              <p className="syh-online-error">
                Your opponent left the table. Return to the menu and start a new room.
              </p>
            ) : null}

            <button type="button" className="syh-text-btn syh-online-leave" disabled={busy} onClick={onLeave}>
              {room?.status === 'completed' ? 'Leave table' : 'Leave room'}
            </button>
          </div>
        ) : null}

        {error ? <p className="syh-online-error" role="alert">{error}</p> : null}
      </section>
    </div>
  )
}
