import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  CHAT_MAX_LENGTH,
  QUICK_PHRASES,
  REPORT_REASONS,
  appendMessage,
  buildReport,
  chatMessageId,
  cleanChatText,
  cleanIncomingChat,
  createRateLimiter,
  submitReport,
  type ChatMessage,
  type ReportReason,
} from '../online/chat'
import type { TableChannel, TableEvent } from '../online/tableChannel'
import { VoiceLink, voiceSupported, type PeerVoiceState, type VoiceStatus } from '../online/voice'

const CHAT_HIDDEN_KEY = 'show-your-hand:chat-hidden:v1'
const chatKey = (roomId: string) => `show-your-hand:chat:${roomId}`
const blockKey = (roomId: string) => `show-your-hand:blocked:${roomId}`

function readSession<T>(key: string, fallback: T): T {
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeSession(key: string, value: unknown) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Session storage is optional.
  }
}

const VOICE_LABEL: Record<VoiceStatus, string> = {
  off: 'Voice off',
  waiting: 'Waiting for opponent to join voice',
  connecting: 'Connecting voice…',
  connected: 'Voice connected',
  failed: 'Voice couldn’t connect on this network',
  denied: 'Microphone permission was denied',
  unsupported: 'Voice isn’t supported in this browser',
}

const VOICE_SHORT: Record<VoiceStatus, string> = {
  off: '',
  waiting: 'Waiting',
  connecting: 'Connecting',
  connected: 'Live',
  failed: 'No voice',
  denied: 'Mic blocked',
  unsupported: '',
}

export type CommsRouter = { current: ((event: string, payload: TableEvent) => void) | null }

export function TableComms({
  channel,
  connected,
  router,
  roomId,
  roomCode,
  selfId,
  selfName,
  opponent,
  isHost,
}: {
  channel: TableChannel | null
  connected: boolean
  router: CommsRouter
  roomId: string
  roomCode: string
  selfId: string
  selfName: string
  opponent: { id: string; name: string } | null
  isHost: boolean
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => readSession(chatKey(roomId), []))
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [bubble, setBubble] = useState<ChatMessage | null>(null)
  const [hidden, setHidden] = useState(() => {
    try {
      return window.localStorage.getItem(CHAT_HIDDEN_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [blocked, setBlocked] = useState<boolean>(() => readSession(blockKey(roomId), false))
  const [reportOpen, setReportOpen] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('off')
  const [peerVoice, setPeerVoice] = useState<PeerVoiceState>({ inVoice: false, muted: false })
  const [micMuted, setMicMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const limiter = useMemo(() => createRateLimiter(), [])
  const openRef = useRef(open)
  openRef.current = open
  const blockedRef = useRef(blocked)
  blockedRef.current = blocked
  const hiddenRef = useRef(hidden)
  hiddenRef.current = hidden
  const channelRef = useRef(channel)
  channelRef.current = channel
  const bubbleTimer = useRef<number | null>(null)

  const voice = useMemo(
    () =>
      new VoiceLink({
        isHost,
        send: (event, payload) => channelRef.current?.send(event, payload),
        onStatus: setVoiceStatus,
        onRemoteStream: (stream) => {
          if (audioRef.current) audioRef.current.srcObject = stream
        },
        onPeer: setPeerVoice,
      }),
    [isHost, roomId],
  )

  useEffect(() => () => voice.leave(), [voice])

  useEffect(() => {
    if (connected) voice.resync()
  }, [connected, voice])

  useEffect(() => writeSession(chatKey(roomId), messages), [messages, roomId])

  useEffect(() => {
    if (open) {
      setUnread(0)
      listRef.current?.lastElementChild?.scrollIntoView({ block: 'end' })
    }
  }, [open, messages.length])

  useEffect(() => {
    router.current = (event, payload) => {
      if (!opponent || payload.from !== opponent.id) return
      if (event === 'chat-ack') {
        setMessages((list) =>
          list.map((message) => (message.id === payload.id ? { ...message, delivered: true } : message)),
        )
        return
      }
      if (blockedRef.current) return
      if (event === 'chat') {
        const body = cleanIncomingChat(payload.body)
        const id = typeof payload.id === 'string' ? payload.id.slice(0, 64) : null
        if (!body || !id) return
        const message: ChatMessage = { id, from: opponent.id, name: opponent.name, body, at: Date.now() }
        setMessages((list) => appendMessage(list, message))
        channelRef.current?.send('chat-ack', { id })
        if (!openRef.current) {
          setUnread((count) => count + 1)
          if (!hiddenRef.current) {
            setBubble(message)
            if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current)
            bubbleTimer.current = window.setTimeout(() => setBubble(null), 4500)
          }
        }
        return
      }
      if (event.startsWith('voice-')) void voice.handle(event, payload)
    }
    return () => {
      router.current = null
    }
  }, [opponent, router, voice])

  const send = (raw: string) => {
    setError(null)
    if (!opponent) return setError('Waiting for an opponent to join the room.')
    if (!channel || !connected) return setError('Chat is reconnecting. Try again in a moment.')
    const cleaned = cleanChatText(raw)
    if (!cleaned.ok) return setError(cleaned.error)
    const allowed = limiter.tryConsume()
    if (!allowed.ok) return setError(allowed.error)
    const message: ChatMessage = {
      id: chatMessageId(),
      from: selfId,
      name: selfName,
      body: cleaned.body,
      at: Date.now(),
      delivered: false,
    }
    setMessages((list) => appendMessage(list, message))
    channel.send('chat', { id: message.id, body: message.body })
    setDraft('')
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    send(draft)
  }

  const toggleHidden = () => {
    const next = !hidden
    setHidden(next)
    if (next) setBubble(null)
    try {
      window.localStorage.setItem(CHAT_HIDDEN_KEY, String(next))
    } catch {
      // Preference storage is optional.
    }
  }

  const block = () => {
    setBlocked(true)
    writeSession(blockKey(roomId), true)
    setBubble(null)
    voice.leave()
  }

  const unblock = () => {
    setBlocked(false)
    writeSession(blockKey(roomId), false)
  }

  const visibleMessages = blocked
    ? messages.filter((message) => message.from === selfId)
    : messages

  const inVoice = voiceStatus === 'waiting' || voiceStatus === 'connecting' || voiceStatus === 'connected'

  return (
    <div className="syh-comms">
      <audio ref={audioRef} autoPlay playsInline />

      {bubble && !open ? (
        <button type="button" className="syh-chat-bubble" onClick={() => setOpen(true)}>
          <b>{bubble.name}</b>
          <span>{bubble.body}</span>
        </button>
      ) : null}

      <div className="syh-comms-bar">
        {voiceSupported() ? (
          <>
            <button
              type="button"
              className={`syh-comms-btn ${inVoice ? 'is-on' : ''} ${voiceStatus === 'connected' ? 'is-live' : ''}`}
              aria-pressed={inVoice}
              disabled={!opponent || blocked || !connected}
              title={VOICE_LABEL[voiceStatus]}
              onClick={() => (inVoice ? voice.leave() : void voice.join())}
            >
              <span aria-hidden="true">{inVoice ? '📞' : '🎙️'}</span>
              <span className="syh-comms-label">{inVoice ? 'Leave voice' : 'Voice'}</span>
            </button>
            {inVoice ? (
              <button
                type="button"
                className={`syh-comms-btn ${micMuted ? 'is-muted' : ''}`}
                aria-pressed={micMuted}
                onClick={() => {
                  setMicMuted(!micMuted)
                  voice.setMuted(!micMuted)
                }}
              >
                <span aria-hidden="true">{micMuted ? '🔇' : '🎤'}</span>
                <span className="syh-comms-label">{micMuted ? 'Unmute' : 'Mute'}</span>
              </button>
            ) : null}
          </>
        ) : null}
        <button
          type="button"
          className={`syh-comms-btn ${open ? 'is-on' : ''}`}
          aria-expanded={open}
          aria-controls="syh-chat-panel"
          onClick={() => setOpen(!open)}
        >
          <span aria-hidden="true">💬</span>
          <span className="syh-comms-label">Chat</span>
          {unread > 0 && !hidden ? (
            <b className="syh-comms-badge" aria-label={`${unread} unread`}>
              {unread > 9 ? '9+' : unread}
            </b>
          ) : null}
        </button>

        {!blocked && (VOICE_SHORT[voiceStatus] || peerVoice.inVoice) ? (
          <p className={`syh-voice-status is-${voiceStatus}`} aria-hidden="true">
            {VOICE_SHORT[voiceStatus] || 'Voice'}
            {peerVoice.inVoice ? (peerVoice.muted ? ' · 🔇' : ' · 🎙️') : ''}
          </p>
        ) : null}
      </div>

      <p className="syh-visually-hidden" role="status" aria-live="polite">
        {blocked
          ? ''
          : `${voiceStatus === 'off' ? '' : VOICE_LABEL[voiceStatus]}${
              peerVoice.inVoice && opponent
                ? `${voiceStatus === 'off' ? '' : '. '}${opponent.name} is in voice${peerVoice.muted ? ' and muted' : ''}.`
                : ''
            }`}
      </p>

      {open ? (
        <section id="syh-chat-panel" className="syh-chat-panel" aria-label="Table chat">
          <header>
            <h2>Table chat</h2>
            <div className="syh-chat-tools">
              <button type="button" onClick={toggleHidden} aria-pressed={hidden}>
                {hidden ? 'Show pop-ups' : 'Hide pop-ups'}
              </button>
              {opponent ? (
                blocked ? (
                  <button type="button" onClick={unblock}>
                    Unblock
                  </button>
                ) : (
                  <button type="button" onClick={block}>
                    Block
                  </button>
                )
              ) : null}
              {opponent ? (
                <button type="button" onClick={() => setReportOpen(true)}>
                  Report
                </button>
              ) : null}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close chat">
                ✕
              </button>
            </div>
          </header>

          {blocked && opponent ? (
            <p className="syh-chat-note">
              You blocked {opponent.name}. Their messages and voice are hidden for this room.
            </p>
          ) : null}

          <ol className="syh-chat-list" ref={listRef} role="log" aria-live="polite">
            {visibleMessages.length === 0 ? (
              <li className="syh-chat-empty">Say hi — quick phrases are below.</li>
            ) : (
              visibleMessages.map((message) => (
                <li key={message.id} className={message.from === selfId ? 'is-mine' : ''}>
                  <b>{message.from === selfId ? 'You' : message.name}</b>
                  <span>{message.body}</span>
                  {message.from === selfId ? (
                    <small>{message.delivered ? 'Delivered' : 'Sending…'}</small>
                  ) : null}
                </li>
              ))
            )}
          </ol>

          <div className="syh-quick-phrases">
            {QUICK_PHRASES.map((phrase) => (
              <button key={phrase} type="button" onClick={() => send(phrase)} disabled={blocked}>
                {phrase}
              </button>
            ))}
          </div>

          <form className="syh-chat-form" onSubmit={onSubmit}>
            <label className="syh-visually-hidden" htmlFor="syh-chat-input">
              Message
            </label>
            <input
              id="syh-chat-input"
              value={draft}
              maxLength={CHAT_MAX_LENGTH}
              autoComplete="off"
              enterKeyHint="send"
              placeholder={blocked ? 'Player blocked' : 'Message…'}
              disabled={blocked}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" className="syh-primary" disabled={blocked || !draft.trim()}>
              Send
            </button>
          </form>
          {error ? (
            <p className="syh-chat-error" role="alert">
              {error}
            </p>
          ) : null}
          <p className="syh-chat-fineprint">
            Chat and voice go directly to the other player and aren’t stored on our servers. Bad
            language is masked. Use Report if someone is abusive.
          </p>
        </section>
      ) : null}

      {reportOpen && opponent ? (
        <ReportDialog
          opponentName={opponent.name}
          onClose={() => setReportOpen(false)}
          onSubmit={async (reason, details, alsoBlock) => {
            await submitReport(
              buildReport({
                roomCode,
                reporterName: selfName,
                reportedName: opponent.name,
                reportedId: opponent.id,
                reason,
                details,
                messages,
              }),
            )
            if (alsoBlock) block()
          }}
        />
      ) : null}
    </div>
  )
}

function ReportDialog({
  opponentName,
  onClose,
  onSubmit,
}: {
  opponentName: string
  onClose: () => void
  onSubmit: (reason: ReportReason, details: string, alsoBlock: boolean) => Promise<void>
}) {
  const [reason, setReason] = useState<ReportReason>(REPORT_REASONS[0])
  const [details, setDetails] = useState('')
  const [alsoBlock, setAlsoBlock] = useState(true)
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('sending')
    setError(null)
    try {
      await onSubmit(reason, details, alsoBlock)
      setStatus('sent')
    } catch (failure) {
      setStatus('error')
      setError(failure instanceof Error ? failure.message : 'Report could not be sent.')
    }
  }

  return (
    <div className="syh-modal syh-report-modal">
      <section className="syh-modal-card" role="dialog" aria-modal="true" aria-labelledby="syh-report-title">
        <h2 id="syh-report-title">Report {opponentName}</h2>
        {status === 'sent' ? (
          <>
            <p role="status">Report sent to the SHOW YOUR HAND team. Thank you for helping keep tables friendly.</p>
            <button type="button" className="syh-primary" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <fieldset>
              <legend>What happened?</legend>
              {REPORT_REASONS.map((item) => (
                <label key={item} className="syh-report-option">
                  <input
                    type="radio"
                    name="report-reason"
                    value={item}
                    checked={reason === item}
                    onChange={() => setReason(item)}
                  />
                  {item}
                </label>
              ))}
            </fieldset>
            <label className="syh-report-details">
              Details (optional)
              <textarea value={details} maxLength={800} onChange={(event) => setDetails(event.target.value)} />
            </label>
            <label className="syh-report-option">
              <input type="checkbox" checked={alsoBlock} onChange={(event) => setAlsoBlock(event.target.checked)} />
              Also block {opponentName}
            </label>
            <p className="syh-chat-fineprint">
              The report includes the room code, both table names, and {opponentName}’s recent chat
              messages from this device.
            </p>
            {error ? (
              <p className="syh-chat-error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="syh-start-actions">
              <button type="button" className="syh-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="syh-primary" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : status === 'error' ? 'Try again' : 'Send report'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
