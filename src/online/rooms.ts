import type { GameState } from '../game/types'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const onlineConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY)

export type OnlineSession = {
  roomId: string
  roomCode: string
  playerId: string
  playerToken: string
  seat: number
  gamePlayerId: string
  stateVersion: number
  isHost: boolean
}

export type OnlineRoomPlayer = {
  id: string
  seat: number
  gamePlayerId: string
  displayName: string
  joinedAt: string
}

export type OnlineRoom = {
  id: string
  code: string
  status: 'waiting' | 'in_game' | 'completed' | 'abandoned'
  maxPlayers: number
  stateVersion: number
  gameState: GameState | null
  players: OnlineRoomPlayer[]
  createdAt: string
  expiresAt: string
}

type JoinRow = {
  room_id: string
  room_code: string
  player_id: string
  player_token: string
  seat: number
  game_player_id: string
  state_version: number
}

const SESSION_KEY = 'show-your-hand:online-session:v1'

function headers() {
  if (!SUPABASE_KEY) throw new Error('Online play is not configured yet.')
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  }
}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Online play is not configured yet.')
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = text
    }
  }

  if (!response.ok) {
    const payload = parsed as { message?: string; details?: string } | null
    throw new Error(payload?.message || payload?.details || `Online request failed (${response.status})`)
  }

  return parsed as T
}

function sessionFrom(row: JoinRow): OnlineSession {
  return {
    roomId: row.room_id,
    roomCode: row.room_code,
    playerId: row.player_id,
    playerToken: row.player_token,
    seat: row.seat,
    gamePlayerId: row.game_player_id,
    stateVersion: row.state_version,
    isHost: row.seat === 0,
  }
}

export async function createRoom(displayName: string): Promise<OnlineSession> {
  const rows = await rpc<JoinRow[]>('syh_create_room', { p_display_name: displayName })
  const row = rows[0]
  if (!row) throw new Error('Room creation returned no session.')
  return sessionFrom(row)
}

export async function joinRoom(code: string, displayName: string): Promise<OnlineSession> {
  const rows = await rpc<JoinRow[]>('syh_join_room', {
    p_code: code.trim().toUpperCase(),
    p_display_name: displayName,
  })
  const row = rows[0]
  if (!row) throw new Error('Room join returned no session.')
  return sessionFrom(row)
}

export async function getRoom(session: OnlineSession): Promise<OnlineRoom> {
  return rpc<OnlineRoom>('syh_get_room', {
    p_code: session.roomCode,
    p_player_token: session.playerToken,
  })
}

export async function startRoom(session: OnlineSession, gameState: GameState): Promise<number> {
  return rpc<number>('syh_start_room', {
    p_room_id: session.roomId,
    p_player_token: session.playerToken,
    p_game_state: gameState,
  })
}

export async function submitRoomState(
  session: OnlineSession,
  expectedVersion: number,
  gameState: GameState,
): Promise<number> {
  return rpc<number>('syh_submit_state', {
    p_room_id: session.roomId,
    p_player_token: session.playerToken,
    p_expected_version: expectedVersion,
    p_game_state: gameState,
    p_status: gameState.phase.type === 'match_over' ? 'completed' : 'in_game',
  })
}

export async function leaveRoom(session: OnlineSession): Promise<void> {
  await rpc<null>('syh_leave_room', {
    p_room_id: session.roomId,
    p_player_token: session.playerToken,
  })
}

export function loadOnlineSession(): OnlineSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as OnlineSession
    if (!parsed.roomId || !parsed.roomCode || !parsed.playerToken || !parsed.gamePlayerId) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function saveOnlineSession(session: OnlineSession | null): void {
  if (typeof window === 'undefined') return
  try {
    if (!session) {
      window.localStorage.removeItem(SESSION_KEY)
      return
    }
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Reconnection is optional if storage is unavailable.
  }
}
