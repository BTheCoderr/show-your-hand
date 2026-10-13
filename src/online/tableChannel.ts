const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

const HEARTBEAT_MS = 25_000
const MAX_BACKOFF_MS = 15_000

export type TableEvent = Record<string, unknown> & { from: string }

export type TableChannel = {
  send: (event: string, payload: Record<string, unknown>) => void
  close: () => void
}

type PhoenixMessage = {
  topic: string
  event: string
  payload: Record<string, unknown>
  ref: string | null
  join_ref?: string | null
}

export function tableTopic(roomId: string): string {
  return `realtime:syh-table-${roomId}`
}

/**
 * Ephemeral table events (live card drags, chat nudges) over Supabase Realtime broadcast.
 * Nothing sent here is stored; game moves and chat text still go through the authoritative server.
 */
export function openTableChannel(
  roomId: string,
  selfId: string,
  onEvent: (event: string, payload: TableEvent) => void,
  onStatus?: (connected: boolean) => void,
): TableChannel | null {
  if (!SUPABASE_URL || !SUPABASE_KEY || typeof WebSocket === 'undefined') return null

  const topic = tableTopic(roomId)
  const socketUrl = `${SUPABASE_URL.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_KEY)}&vsn=1.0.0`
  let socket: WebSocket | null = null
  let joined = false
  let closed = false
  let ref = 0
  let joinRef: string | null = null
  let heartbeat: number | null = null
  let retry: number | null = null
  let backoff = 1000

  const nextRef = () => String(++ref)
  const setJoined = (value: boolean) => {
    if (joined === value) return
    joined = value
    onStatus?.(value)
  }

  const write = (message: PhoenixMessage) => {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
  }

  const connect = () => {
    if (closed) return
    socket = new WebSocket(socketUrl)

    socket.onopen = () => {
      joinRef = nextRef()
      write({
        topic,
        event: 'phx_join',
        ref: joinRef,
        join_ref: joinRef,
        payload: {
          config: {
            broadcast: { self: false, ack: false },
            presence: { key: '', enabled: false },
            postgres_changes: [],
            private: false,
          },
          access_token: SUPABASE_KEY,
        },
      })
      heartbeat = window.setInterval(() => {
        write({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: nextRef() })
      }, HEARTBEAT_MS)
    }

    socket.onmessage = (raw) => {
      let message: PhoenixMessage
      try {
        message = JSON.parse(String(raw.data)) as PhoenixMessage
      } catch {
        return
      }
      if (message.topic !== topic) return
      if (message.event === 'phx_reply' && message.ref === joinRef) {
        const ok = (message.payload as { status?: string }).status === 'ok'
        if (ok) backoff = 1000
        setJoined(ok)
        return
      }
      if (message.event === 'broadcast') {
        const body = message.payload as { event?: string; payload?: TableEvent }
        if (!body.event || !body.payload || body.payload.from === selfId) return
        onEvent(body.event, body.payload)
        return
      }
      if (message.event === 'phx_error' || message.event === 'phx_close') {
        setJoined(false)
        socket?.close()
      }
    }

    socket.onclose = () => {
      setJoined(false)
      if (heartbeat) window.clearInterval(heartbeat)
      heartbeat = null
      if (closed) return
      retry = window.setTimeout(connect, backoff)
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
    }
  }

  connect()

  return {
    send(event, payload) {
      if (!joined || !joinRef) return
      write({
        topic,
        event: 'broadcast',
        ref: null,
        join_ref: joinRef,
        payload: { type: 'broadcast', event, payload: { ...payload, from: selfId } },
      })
    },
    close() {
      closed = true
      if (retry) window.clearTimeout(retry)
      if (heartbeat) window.clearInterval(heartbeat)
      if (socket && socket.readyState === WebSocket.OPEN && joinRef) {
        write({ topic, event: 'phx_leave', payload: {}, ref: nextRef(), join_ref: joinRef })
      }
      socket?.close()
      setJoined(false)
    },
  }
}
