
import { createClient } from 'npm:@supabase/supabase-js@2'
import { actorId, emptyMenuState, reduce } from './game/engine.ts'
import type { Action, GameState } from './game/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  let key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const secrets = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (secrets) {
    try {
      key = JSON.parse(secrets).default ?? key
    } catch {
      // Fall back to the legacy service-role key when present.
    }
  }
  if (!url || !key) throw new Error('Supabase admin environment is unavailable.')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function projectState(input: GameState | null, viewerId: string): GameState | null {
  if (!input) return null
  const state = structuredClone(input) as GameState
  const winnerId =
    state.phase.type === 'round_over' || state.phase.type === 'match_over'
      ? state.phase.winnerId
      : null

  for (const player of state.players) {
    const visible =
      player.id === viewerId ||
      state.revealedUntilTurnEnd.includes(player.id) ||
      player.id === winnerId
    if (visible) continue

    player.hand = player.hand.map((_, index) => {
      const id = `__hidden_${player.id}_${index + 1}`
      state.catalog[id] = { id, kind: 'blank', art: '/cards/back.png' }
      return id
    })
  }

  state.drawPile = state.drawPile.map((_, index) => `__draw_${index + 1}`)
  state.rngState = 0
  return state
}

function actionPlayerId(action: Action): string | null {
  return 'playerId' in action ? String(action.playerId) : null
}

async function updateStats(
  supabase: ReturnType<typeof adminClient>,
  roomId: string,
  before: GameState,
  after: GameState,
  action: Action,
) {
  const actor = actionPlayerId(action) ?? actorId(before)
  if (actor) {
    const { data: current } = await supabase
      .from('syh_room_player_stats')
      .select('*')
      .eq('room_id', roomId)
      .eq('game_player_id', actor)
      .maybeSingle()

    const row = current ?? {
      room_id: roomId,
      game_player_id: actor,
      attacks_played: 0,
      defenses_played: 0,
      blank_defenses: 0,
      rounds_won: 0,
      specials_played: 0,
      match_wins: 0,
    }

    const playedAttack =
      action.type === 'CONFIRM_ATTACK' ||
      (action.type === 'SELECT_CARD' && before.catalog[action.cardId]?.kind === 'skip')
    const defended =
      action.type === 'RESPOND_DEFENSE' && action.response !== 'accept'
    const blankDefense =
      (action.type === 'RESPOND_DEFENSE' && action.response === 'blank') ||
      (action.type === 'RESPOND_REVERSE_BLANK' && action.response === 'blank')

    if (playedAttack) {
      row.attacks_played += 1
      row.specials_played += 1
    }
    if (defended) row.defenses_played += 1
    if (blankDefense) row.blank_defenses += 1

    await supabase.from('syh_room_player_stats').upsert({
      ...row,
      updated_at: new Date().toISOString(),
    })
  }

  const beforeEnded = before.phase.type === 'round_over' || before.phase.type === 'match_over'
  const afterEnded = after.phase.type === 'round_over' || after.phase.type === 'match_over'
  if (!beforeEnded && afterEnded) {
    const winnerId = after.phase.winnerId
    const { data: current } = await supabase
      .from('syh_room_player_stats')
      .select('*')
      .eq('room_id', roomId)
      .eq('game_player_id', winnerId)
      .maybeSingle()

    const row = current ?? {
      room_id: roomId,
      game_player_id: winnerId,
      attacks_played: 0,
      defenses_played: 0,
      blank_defenses: 0,
      rounds_won: 0,
      specials_played: 0,
      match_wins: 0,
    }
    row.rounds_won += 1
    if (after.phase.type === 'match_over') row.match_wins += 1

    await supabase.from('syh_room_player_stats').upsert({
      ...row,
      updated_at: new Date().toISOString(),
    })
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const body = await req.json()
    const op = String(body?.op ?? '')
    const roomId = String(body?.roomId ?? '')
    const playerToken = String(body?.playerToken ?? '')
    if (!roomId || !playerToken) return json({ error: 'Missing room credentials' }, 400)

    const supabase = adminClient()
    const { data: member, error: memberError } = await supabase
      .from('syh_room_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('player_token', playerToken)
      .single()
    if (memberError || !member) return json({ error: 'Invalid room token' }, 403)

    if (op === 'start') {
      if (member.seat !== 0) return json({ error: 'Only the host can start the room' }, 403)

      const { data: room, error: roomError } = await supabase
        .from('syh_rooms')
        .select('*')
        .eq('id', roomId)
        .single()
      if (roomError || !room || room.status !== 'waiting') {
        return json({ error: 'Room is not waiting' }, 409)
      }
      if (room.mode !== 'standard') return json({ error: 'Hardcore mode is not enabled yet' }, 400)

      const { data: players, error: playersError } = await supabase
        .from('syh_room_players')
        .select('*')
        .eq('room_id', roomId)
        .order('seat')
      if (playersError || !players || players.length !== 2) {
        return json({ error: 'Two players are required to start' }, 409)
      }
      if (!players.every((player) => player.ready)) {
        return json({ error: 'Both players must be ready' }, 409)
      }

      let state = reduce(emptyMenuState(false), {
        type: 'START_MATCH',
        opponentCount: 1,
        testMode: false,
      })
      state.players = state.players.map((player, index) => ({
        ...player,
        name: players[index]?.display_name ?? player.name,
        isHuman: true,
      }))

      const nextVersion = Number(room.state_version) + 1
      const { error: updateError } = await supabase
        .from('syh_rooms')
        .update({
          game_state: state,
          status: 'in_game',
          state_version: nextVersion,
          match_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', roomId)
        .eq('state_version', room.state_version)
      if (updateError) throw updateError

      await supabase.from('syh_room_player_stats').upsert(
        players.map((player) => ({
          room_id: roomId,
          game_player_id: player.game_player_id,
          attacks_played: 0,
          defenses_played: 0,
          blank_defenses: 0,
          rounds_won: 0,
          specials_played: 0,
          match_wins: 0,
          updated_at: new Date().toISOString(),
        })),
      )

      return json({
        stateVersion: nextVersion,
        status: 'in_game',
        gameState: projectState(state, member.game_player_id),
      })
    }

    if (op === 'action') {
      const expectedVersion = Number(body?.expectedVersion)
      const action = body?.action as Action
      if (!Number.isFinite(expectedVersion) || !action?.type) {
        return json({ error: 'Invalid action request' }, 400)
      }

      const { data: room, error: roomError } = await supabase
        .from('syh_rooms')
        .select('*')
        .eq('id', roomId)
        .single()
      if (roomError || !room || room.status !== 'in_game' || !room.game_state) {
        return json({ error: 'Room is not in an active game' }, 409)
      }
      if (Number(room.state_version) !== expectedVersion) {
        return json({ error: 'STALE_STATE' }, 409)
      }

      const before = room.game_state as GameState
      const expectedActor = actorId(before)
      if (before.phase.type === 'round_over') {
        if (action.type !== 'NEXT_ROUND') return json({ error: 'NEXT_ROUND required' }, 409)
      } else if (!expectedActor || expectedActor !== member.game_player_id) {
        return json({ error: 'NOT_YOUR_TURN' }, 403)
      }

      const claimedPlayer = actionPlayerId(action)
      if (claimedPlayer && claimedPlayer !== member.game_player_id) {
        return json({ error: 'PLAYER_MISMATCH' }, 403)
      }

      const after = reduce(before, action)
      const blocked = after.history.at(-1)?.startsWith('Action blocked:')
      if (blocked) {
        return json({ error: after.history.at(-1)?.replace('Action blocked: ', '') ?? 'Illegal move' }, 400)
      }

      const { data: nextVersion, error: commitError } = await supabase.rpc(
        'syh_commit_authoritative_state',
        {
          p_room_id: roomId,
          p_expected_version: expectedVersion,
          p_game_state: after,
        },
      )
      if (commitError) {
        const message = commitError.message?.includes('STALE_STATE') ? 'STALE_STATE' : commitError.message
        return json({ error: message }, 409)
      }

      await updateStats(supabase, roomId, before, after, action)

      if (after.phase.type === 'match_over') {
        const winner = after.players.find((player) => player.id === after.phase.winnerId)
        const { data: roomAfter } = await supabase
          .from('syh_rooms')
          .select('rematch_sequence')
          .eq('id', roomId)
          .single()
        const { data: stats } = await supabase
          .from('syh_room_player_stats')
          .select('*')
          .eq('room_id', roomId)

        await supabase.from('syh_match_results').upsert({
          room_id: roomId,
          rematch_sequence: Number(roomAfter?.rematch_sequence ?? 0),
          winner_game_player_id: winner?.id ?? after.phase.winnerId,
          winner_display_name: winner?.name ?? 'Winner',
          summary: {
            finalScores: after.players.map((player) => ({
              gamePlayerId: player.id,
              name: player.name,
              score: player.score,
            })),
            stats: stats ?? [],
          },
          completed_at: new Date().toISOString(),
        })
      }

      return json({
        stateVersion: Number(nextVersion),
        status: after.phase.type === 'match_over' ? 'completed' : 'in_game',
        gameState: projectState(after, member.game_player_id),
      })
    }

    return json({ error: 'Unknown operation' }, 400)
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : String(error) },
      500,
    )
  }
})
