import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Action, GameState } from '../../src/game/types'

const SUPABASE_URL = (
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  'https://iymdhcobwijfoupopljd.supabase.co'
).replace(/\/$/, '')

const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_-AWzMm4BPIBFBFntMup0Qg_oJWhIUlH'

const SESSION_KEY = 'show-your-hand:mobile-online-session:v1'
const ONLINE_REQUEST_TIMEOUT_MS = 12000

export type OnlinePlayerStats = {
  attacksPlayed: number
  defensesPlayed: number
  blankDefenses: number
  roundsWon: number
  specialsPlayed: number
  matchWins: number
}

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
  ready: boolean
  rematchReady: boolean
  joinedAt: string
  lastSeenAt: string
  connected: boolean
  disconnectGraceSeconds: number
  stats: OnlinePlayerStats
  matchStats: OnlinePlayerStats
}

export type OnlineRoom = {
  id: string
  code: string
  status: 'waiting' | 'in_game' | 'completed' | 'abandoned'
  maxPlayers: number
  stateVersion: number
  gameState: GameState | null
  players: OnlineRoomPlayer[]
  rematchSequence: number
  mode: 'standard' | 'hardcore'
  beginnerMode: boolean
  matchStartedAt: string | null
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

export type AuthoritativeResponse = {
  stateVersion: number
  status: OnlineRoom['status']
  gameState: GameState
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ONLINE_REQUEST_TIMEOUT_MS)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Online request timed out. Check your connection and try again.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

function headers() {
  return {
    apikey: SUPABASE_KEY,
    'Content-Type': 'application/json',
  }
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      ...headers(),
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(body),
  })

  const parsed = await parseResponse(response)
  if (!response.ok) {
    const payload = parsed as { message?: string; details?: string } | null
    throw new Error(
      payload?.message ||
        payload?.details ||
        `Online request failed (${response.status})`,
    )
  }

  return parsed as T
}

async function gameFunction<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetchWithTimeout(
    `${SUPABASE_URL}/functions/v1/show-your-hand-game`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    },
  )

  const parsed = await parseResponse(response)
  if (!response.ok) {
    const payload = parsed as { error?: string; message?: string } | null
    throw new Error(
      payload?.error ||
        payload?.message ||
        `Game server failed (${response.status})`,
    )
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
    stateVersion: Number(row.state_version),
    isHost: row.seat === 0,
  }
}

export async function createRoom(displayName: string): Promise<OnlineSession> {
  const rows = await rpc<JoinRow[]>('syh_create_room', {
    p_display_name: displayName,
  })
  const row = rows[0]
  if (!row) throw new Error('Room creation returned no session.')
  const session = sessionFrom(row)
  await saveOnlineSession(session)
  return session
}

export async function joinRoom(
  code: string,
  displayName: string,
): Promise<OnlineSession> {
  const rows = await rpc<JoinRow[]>('syh_join_room', {
    p_code: code.trim().toUpperCase(),
    p_display_name: displayName,
  })
  const row = rows[0]
  if (!row) throw new Error('Room join returned no session.')
  const session = sessionFrom(row)
  await saveOnlineSession(session)
  return session
}

export async function getRoom(session: OnlineSession): Promise<OnlineRoom> {
  return rpc<OnlineRoom>('syh_get_room', {
    p_code: session.roomCode,
    p_player_token: session.playerToken,
  })
}

export async function setReady(
  session: OnlineSession,
  ready: boolean,
): Promise<void> {
  await rpc<null>('syh_set_ready', {
    p_room_id: session.roomId,
    p_player_token: session.playerToken,
    p_ready: ready,
  })
}

export async function setRoomOptions(
  session: OnlineSession,
  options: { beginnerMode: boolean; mode: 'standard' | 'hardcore' },
): Promise<void> {
  await rpc<null>('syh_set_room_options', {
    p_room_id: session.roomId,
    p_player_token: session.playerToken,
    p_beginner_mode: options.beginnerMode,
    p_mode: options.mode,
  })
}

export async function requestRematch(
  session: OnlineSession,
  ready: boolean,
): Promise<boolean> {
  const result = await rpc<{ reset?: boolean }>('syh_request_rematch', {
    p_room_id: session.roomId,
    p_player_token: session.playerToken,
    p_ready: ready,
  })
  return Boolean(result?.reset)
}

export async function startRoom(
  session: OnlineSession,
): Promise<AuthoritativeResponse> {
  return gameFunction<AuthoritativeResponse>({
    op: 'start',
    roomId: session.roomId,
    playerToken: session.playerToken,
  })
}

export async function submitAction(
  session: OnlineSession,
  expectedVersion: number,
  action: Action,
): Promise<AuthoritativeResponse> {
  return gameFunction<AuthoritativeResponse>({
    op: 'action',
    roomId: session.roomId,
    playerToken: session.playerToken,
    expectedVersion,
    action,
  })
}

export async function leaveRoom(session: OnlineSession): Promise<void> {
  try {
    await rpc<null>('syh_leave_room', {
      p_room_id: session.roomId,
      p_player_token: session.playerToken,
    })
  } finally {
    await saveOnlineSession(null)
  }
}

export async function loadOnlineSession(): Promise<OnlineSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as OnlineSession
    if (
      !parsed.roomId ||
      !parsed.roomCode ||
      !parsed.playerToken ||
      !parsed.gamePlayerId
    ) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export async function saveOnlineSession(
  session: OnlineSession | null,
): Promise<void> {
  if (!session) {
    await AsyncStorage.removeItem(SESSION_KEY)
    return
  }
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function webJoinUrl(code: string): string {
  return `https://show-your-hand.netlify.app/join/${code.toUpperCase()}`
}
