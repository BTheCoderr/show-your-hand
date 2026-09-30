import { useState } from 'react'
import type { OnlineRoom, OnlineSession } from '../online/rooms'

type Props = {
  open: boolean
  configured: boolean
  session: OnlineSession | null
  room: OnlineRoom | null
  busy: boolean
  error: string | null
  onClose: () => void
  onCreate: (name: string) => void
  onJoin: (code: string, name: string) => void
  onStart: () => void
  onLeave: () => void
}

export function OnlineLobby({
  open,
  configured,
  session,
  room,
  busy,
  error,
  onClose,
  onCreate,
  onJoin,
  onStart,
  onLeave,
}: Props) {
  const [name, setName] = useState('Player')
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const copyCode = async () => {
    if (!session) return
    try {
      await navigator.clipboard.writeText(session.roomCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

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
            Online play is connected in the codebase, but the production environment variables are not available in this build yet.
          </div>
        ) : null}

        {configured && !session ? (
          <>
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
                <p>Create a private six-character room code and send it to a friend.</p>
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
                <p>Enter the code from the host. Online beta currently supports two real players.</p>
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
              <button type="button" className="syh-text-btn" onClick={copyCode}>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="syh-online-players">
              <h3>At the table</h3>
              {(room?.players ?? []).map((player) => (
                <div key={player.id}>
                  <span className="syh-online-seat">{player.seat === 0 ? 'HOST' : 'GUEST'}</span>
                  <b>{player.displayName}</b>
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

            {room?.status === 'waiting' && session.isHost ? (
              <button
                type="button"
                className="syh-primary syh-online-start"
                disabled={busy || room.players.length !== 2}
                onClick={onStart}
              >
                {room.players.length === 2 ? 'Start online match' : 'Waiting for opponent'}
              </button>
            ) : null}

            {room?.status === 'waiting' && !session.isHost ? (
              <p className="syh-online-message">You’re in. The host will start the match.</p>
            ) : null}

            {room?.status === 'abandoned' ? (
              <p className="syh-online-message">This table was closed.</p>
            ) : null}

            <button type="button" className="syh-text-btn syh-online-leave" disabled={busy} onClick={onLeave}>
              Leave room
            </button>
          </div>
        ) : null}

        {error ? <p className="syh-online-error" role="alert">{error}</p> : null}
      </section>
    </div>
  )
}
