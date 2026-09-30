import { useEffect, useMemo, useState } from 'react'
import { onlineJoinUrl, type OnlineRoom, type OnlineSession } from '../online/rooms'

type Props = {
  open: boolean
  configured: boolean
  inviteCode?: string | null
  session: OnlineSession | null
  room: OnlineRoom | null
  busy: boolean
  error: string | null
  onClose: () => void
  onCreate: (name: string) => void
  onJoin: (code: string, name: string) => void
  onReady: (ready: boolean) => void
  onStart: () => void
  onLeave: () => void
}

function isRecentlySeen(lastSeenAt: string): boolean {
  const timestamp = Date.parse(lastSeenAt)
  return Number.isFinite(timestamp) && Date.now() - timestamp < 45_000
}

export function OnlineLobby({
  open,
  configured,
  inviteCode,
  session,
  room,
  busy,
  error,
  onClose,
  onCreate,
  onJoin,
  onReady,
  onStart,
  onLeave,
}: Props) {
  const [name, setName] = useState('Player')
  const [code, setCode] = useState(inviteCode ?? '')
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  useEffect(() => {
    if (inviteCode) setCode(inviteCode)
  }, [inviteCode])

  const currentPlayer = useMemo(
    () => room?.players.find((player) => player.gamePlayerId === session?.gamePlayerId) ?? null,
    [room, session?.gamePlayerId],
  )
  const allReady = Boolean(
    room && room.players.length === 2 && room.players.every((player) => player.ready),
  )
  const joinUrl = session ? onlineJoinUrl(session.roomCode) : ''
  const qrUrl = joinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(joinUrl)}`
    : ''

  if (!open) return null

  const copyText = async (value: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(type)
      window.setTimeout(() => setCopied(null), 1200)
    } catch {
      setCopied(null)
    }
  }

  const shareInvite = async () => {
    if (!joinUrl || !session) return
    const shareData = {
      title: 'SHOW YOUR HAND',
      text: `Join my SHOW YOUR HAND table. Room ${session.roomCode}`,
      url: joinUrl,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // Fall back to copying the link when native share is cancelled or unavailable.
      }
    }
    await copyText(joinUrl, 'link')
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
            Online play is connected in the codebase, but this build is missing its public Supabase configuration.
          </div>
        ) : null}

        {configured && !session ? (
          <>
            {inviteCode ? (
              <div className="syh-online-invite-banner">
                <b>Invite loaded</b>
                <span>Room {inviteCode} is ready to join. Enter your table name below.</span>
              </div>
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
              {!inviteCode ? (
                <article>
                  <h3>Host a table</h3>
                  <p>Create a private room, share the link or QR code, then ready up.</p>
                  <button
                    type="button"
                    className="syh-primary"
                    disabled={busy || !name.trim()}
                    onClick={() => onCreate(name.trim())}
                  >
                    {busy ? 'Creating…' : 'Create room'}
                  </button>
                </article>
              ) : null}

              <article className={inviteCode ? 'is-invite-join' : ''}>
                <h3>Join a table</h3>
                <p>Enter the room code from the host, or use the invite link that brought you here.</p>
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
              <button
                type="button"
                className="syh-text-btn"
                onClick={() => void copyText(session.roomCode, 'code')}
              >
                {copied === 'code' ? 'Copied' : 'Copy code'}
              </button>
            </div>

            {room?.status === 'waiting' && session.isHost ? (
              <div className="syh-invite-tools">
                <div className="syh-invite-copy">
                  <span>INVITE LINK</span>
                  <code>{joinUrl.replace(/^https?:\/\//, '')}</code>
                  <div>
                    <button
                      type="button"
                      className="syh-secondary"
                      onClick={() => void shareInvite()}
                    >
                      {copied === 'link' ? 'Link copied' : 'Share invite'}
                    </button>
                    <button
                      type="button"
                      className="syh-text-btn"
                      onClick={() => void copyText(joinUrl, 'link')}
                    >
                      Copy link
                    </button>
                  </div>
                </div>
                <img className="syh-room-qr" src={qrUrl} alt={`QR code to join room ${session.roomCode}`} />
              </div>
            ) : null}

            <div className="syh-online-players">
              <h3>At the table</h3>
              {(room?.players ?? []).map((player) => {
                const connected = isRecentlySeen(player.lastSeenAt)
                return (
                  <div key={player.id}>
                    <span className="syh-online-seat">{player.seat === 0 ? 'HOST' : 'GUEST'}</span>
                    <span className={`syh-connection-dot ${connected ? 'is-connected' : 'is-reconnecting'}`} />
                    <b>{player.displayName}</b>
                    <span className="syh-online-presence">
                      {connected ? 'Connected' : 'Reconnecting…'}
                    </span>
                    <span className={`syh-ready-badge ${player.ready ? 'is-ready' : ''}`}>
                      {player.ready ? 'READY' : 'NOT READY'}
                    </span>
                    {player.gamePlayerId === session.gamePlayerId ? <em>You</em> : null}
                  </div>
                )
              })}
              {!room || room.players.length < 2 ? (
                <div className="syh-online-waiting">
                  <span className="syh-online-pulse" />
                  Waiting for Player 2…
                </div>
              ) : null}
            </div>

            {room?.status === 'waiting' ? (
              <button
                type="button"
                className={`syh-secondary syh-ready-button ${currentPlayer?.ready ? 'is-ready' : ''}`}
                disabled={busy || !currentPlayer}
                onClick={() => onReady(!currentPlayer?.ready)}
              >
                {currentPlayer?.ready ? 'Ready ✓' : 'I’m ready'}
              </button>
            ) : null}

            {room?.status === 'waiting' && session.isHost ? (
              <button
                type="button"
                className="syh-primary syh-online-start"
                disabled={busy || !allReady}
                onClick={onStart}
              >
                {room.players.length < 2
                  ? 'Waiting for opponent'
                  : allReady
                    ? 'Start online match'
                    : 'Both players must be ready'}
              </button>
            ) : null}

            {room?.status === 'waiting' && !session.isHost ? (
              <p className="syh-online-message">
                {currentPlayer?.ready
                  ? 'You’re ready. Waiting for the host to start the match.'
                  : 'Ready up when you’re set. The host starts after both players are ready.'}
              </p>
            ) : null}

            {room?.status === 'abandoned' ? (
              <p className="syh-online-message">This table was closed.</p>
            ) : null}

            <button
              type="button"
              className="syh-text-btn syh-online-leave"
              disabled={busy}
              onClick={onLeave}
            >
              Leave room
            </button>
          </div>
        ) : null}

        {error ? <p className="syh-online-error" role="alert">{error}</p> : null}
      </section>
    </div>
  )
}
