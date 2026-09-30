import { createClient } from 'npm:@supabase/supabase-js@2'
import { actorId, emptyMenuState, reduce } from './game/engine.ts'
import type { Action, GameState } from './game/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function validPublishableKey(req: Request): boolean {
  const supplied = req.headers.get('apikey') ?? ''
  if (!supplied) return false
  try {
    const current = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>
    if (Object.values(current).includes(supplied)) return true
  } catch {}
  return supplied === (Deno.env.get('SUPABASE_ANON_KEY') ?? '')
}

function adminClient() {
  let key = ''
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>
    key = keys.default ?? ''
  } catch {}
  key ||= Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  if (!url || !key) throw new Error('Server database credentials are unavailable')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

type MemberRow = { id: string; room_id: string; seat: number; game_player_id: string; display_name: string; player_token: string; ready: boolean; rematch_ready: boolean }
type RoomRow = { id: string; code: string; status: 'waiting'|'in_game'|'completed'|'abandoned'; state_version: number; game_state: GameState|null; rematch_sequence: number }

function projectState(state: GameState, viewerId: string): GameState {
  const projected = structuredClone(state)
  const revealed = new Set(projected.revealedUntilTurnEnd)
  projected.players = projected.players.map((player) => {
    if (player.id === viewerId || revealed.has(player.id)) return player
    return { ...player, hand: player.hand.map((_, index) => '__hidden_' + player.id + '_' + index) }
  })
  projected.drawPile = projected.drawPile.map((_, index) => '__draw_' + index)
  projected.rngState = 0
  return projected
}

const ONLINE_ACTIONS = new Set(['SELECT_CARD','TAKE_DISCARD','CLAIM_DROPPED','TRIM_HAND','CANCEL_SELECTION','CONFIRM_ATTACK','RESPOND_DEFENSE','CHOOSE_REVERSE_COLOR','RESPOND_REVERSE_BLANK','DECLARE','PASS_DECLARE','CONTINUE','NEXT_ROUND'])

async function loadContext(roomId: string, playerToken: string) {
  const supabase = adminClient()
  const { data: room, error: roomError } = await supabase.from('syh_rooms').select('id,code,status,state_version,game_state,rematch_sequence').eq('id', roomId).maybeSingle()
  if (roomError) throw roomError
  if (!room) return { supabase, error: json({ message: 'Room not found' }, 404) }
  const { data: member, error: memberError } = await supabase.from('syh_room_players').select('id,room_id,seat,game_player_id,display_name,player_token,ready,rematch_ready').eq('room_id', roomId).eq('player_token', playerToken).maybeSingle()
  if (memberError) throw memberError
  if (!member) return { supabase, error: json({ message: 'Invalid room token' }, 403) }
  return { supabase, room: room as RoomRow, member: member as MemberRow }
}

async function startMatch(roomId: string, playerToken: string, expectedVersion: number) {
  const context = await loadContext(roomId, playerToken)
  if ('error' in context) return context.error
  const { supabase, room, member } = context
  if (!room || !member) return json({ message: 'Room context unavailable' }, 500)
  if (member.seat !== 0) return json({ message: 'Only the host can start the room' }, 403)
  if (room.status !== 'waiting') return json({ message: 'Room is not waiting' }, 409)
  if (Number(room.state_version) !== Number(expectedVersion)) return json({ message: 'STALE_STATE' }, 409)
  const { data: players, error: playersError } = await supabase.from('syh_room_players').select('id,seat,game_player_id,display_name,ready').eq('room_id', roomId).order('seat')
  if (playersError) throw playersError
  if (!players || players.length !== 2) return json({ message: 'Two players are required to start' }, 409)
  if (!players.every((player) => player.ready)) return json({ message: 'Both players must be ready' }, 409)
  let state = reduce(emptyMenuState(false), { type: 'START_MATCH', opponentCount: 1, testMode: false })
  state.players = state.players.map((player) => {
    const onlinePlayer = players.find((item) => item.game_player_id === player.id)
    if (!onlinePlayer) throw new Error('Missing online player mapping for ' + player.id)
    return { ...player, name: onlinePlayer.display_name, isHuman: true }
  })
  state.history = [
    'Online match started — ' + state.players[0].name + ' vs ' + state.players[1].name + '. First to ' + state.matchPointGoal + ' wins.',
    state.players[state.currentPlayerIndex].name + ' starts the round.',
  ]
  const nextVersion = Number(room.state_version) + 1
  const { data: updated, error: updateError } = await supabase.from('syh_rooms').update({ game_state: state, status: 'in_game', state_version: nextVersion, updated_at: new Date().toISOString() }).eq('id', roomId).eq('status', 'waiting').eq('state_version', room.state_version).select('state_version').maybeSingle()
  if (updateError) throw updateError
  if (!updated) return json({ message: 'STALE_STATE' }, 409)
  await supabase.from('syh_room_players').update({ ready: false, rematch_ready: false, last_seen_at: new Date().toISOString() }).eq('room_id', roomId)
  return json({ stateVersion: Number(updated.state_version), status: 'in_game', gameState: projectState(state, member.game_player_id) })
}

async function applyAction(roomId: string, playerToken: string, expectedVersion: number, rawAction: unknown) {
  const context = await loadContext(roomId, playerToken)
  if ('error' in context) return context.error
  const { supabase, room, member } = context
  if (!room || !member) return json({ message: 'Room context unavailable' }, 500)
  if (room.status !== 'in_game' || !room.game_state) return json({ message: 'Room is not in an active game' }, 409)
  if (Number(room.state_version) !== Number(expectedVersion)) return json({ message: 'STALE_STATE' }, 409)
  const candidate = rawAction as Record<string, unknown>
  if (!candidate || typeof candidate !== 'object' || !ONLINE_ACTIONS.has(String(candidate.type ?? ''))) return json({ message: 'Unsupported online action' }, 400)
  const state = room.game_state
  const actor = actorId(state)
  const isRoundAdvance = state.phase.type === 'round_over' && candidate.type === 'NEXT_ROUND'
  if (!isRoundAdvance && actor !== member.game_player_id) return json({ message: 'NOT_YOUR_TURN' }, 403)
  const action = structuredClone(candidate) as Record<string, unknown>
  if ('playerId' in action) action.playerId = member.game_player_id
  const next = reduce(state, action as Action)
  const last = next.history.at(-1) ?? ''
  if (last.startsWith('Action blocked:')) {
    const cleanMessage = last.slice('Action blocked:'.length).trim() || 'Action blocked'
    return json({ message: cleanMessage }, 400)
  }
  const nextStatus = next.phase.type === 'match_over' ? 'completed' : 'in_game'
  const nextVersion = Number(room.state_version) + 1
  const { data: updated, error: updateError } = await supabase.from('syh_rooms').update({ game_state: next, status: nextStatus, state_version: nextVersion, updated_at: new Date().toISOString() }).eq('id', roomId).eq('status', 'in_game').eq('state_version', room.state_version).select('state_version').maybeSingle()
  if (updateError) throw updateError
  if (!updated) return json({ message: 'STALE_STATE' }, 409)
  await supabase.from('syh_room_players').update({ last_seen_at: new Date().toISOString() }).eq('id', member.id)
  return json({ stateVersion: Number(updated.state_version), status: nextStatus, gameState: projectState(next, member.game_player_id) })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ message: 'Method not allowed' }, 405)
  if (!validPublishableKey(req)) return json({ message: 'Invalid API key' }, 401)
  try {
    const body = await req.json() as { op?: 'start'|'action'; roomId?: string; playerToken?: string; expectedVersion?: number; action?: unknown }
    if (!body.roomId || !body.playerToken || typeof body.expectedVersion !== 'number') return json({ message: 'Missing room credentials or state version' }, 400)
    if (body.op === 'start') return await startMatch(body.roomId, body.playerToken, body.expectedVersion)
    if (body.op === 'action') return await applyAction(body.roomId, body.playerToken, body.expectedVersion, body.action)
    return json({ message: 'Unknown operation' }, 400)
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Unexpected server error' }, 500)
  }
})