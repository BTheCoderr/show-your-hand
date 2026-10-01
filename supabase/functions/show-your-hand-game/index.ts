import { createClient } from 'npm:@supabase/supabase-js@2'
import { actorId, emptyMenuState, reduce } from './game/engine.ts'
import { validPublicApiKey } from './auth.ts'
import { onlineActionError, onlineStateInvariantError } from './protocol.ts'
import type { Action, GameState } from './game/types.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type StatsRow = {
  room_id: string
  rematch_sequence?: number
  game_player_id: string
  attacks_played: number
  defenses_played: number
  blank_defenses: number
  rounds_won: number
  specials_played: number
  match_wins: number
  updated_at?: string
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

  const activePlayer = state.players[state.currentPlayerIndex]
  if (
    state.phase.type === 'choose_targets' &&
    activePlayer &&
    activePlayer.id !== viewerId
  ) {
    const hiddenSelectionId = '__hidden_selection'
    state.catalog[hiddenSelectionId] = {
      id: hiddenSelectionId,
      kind: 'blank',
      art: '/cards/back.png',
    }
    state.phase = { ...state.phase, cardId: hiddenSelectionId }
    state.selectedCardId = null
  }

  state.drawPile = state.drawPile.map((_, index) => `__draw_${index + 1}`)
  state.rngState = 0
  return state
}

function actionPlayerId(action: Action): string | null {
  return 'playerId' in action ? String(action.playerId) : null
}

function emptyStats(
  roomId: string,
  playerId: string,
  rematchSequence?: number,
): StatsRow {
  return {
    room_id: roomId,
    ...(rematchSequence === undefined ? {} : { rematch_sequence: rematchSequence }),
    game_player_id: playerId,
    attacks_played: 0,
    defenses_played: 0,
    blank_defenses: 0,
    rounds_won: 0,
    specials_played: 0,
    match_wins: 0,
  }
}

async function loadStatsRow(
  supabase: ReturnType<typeof adminClient>,
  table: 'syh_room_player_stats' | 'syh_match_player_stats',
  roomId: string,
  playerId: string,
  rematchSequence?: number,
): Promise<StatsRow> {
  let query = supabase
    .from(table)
    .select('*')
    .eq('room_id', roomId)
    .eq('game_player_id', playerId)

  if (rematchSequence !== undefined) {
    query = query.eq('rematch_sequence', rematchSequence)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return (data as StatsRow | null) ?? emptyStats(roomId, playerId, rematchSequence)
}

async function saveStatsRow(
  supabase: ReturnType<typeof adminClient>,
  table: 'syh_room_player_stats' | 'syh_match_player_stats',
  row: StatsRow,
) {
  const { error } = await supabase.from(table).upsert({
    ...row,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

async function bumpStats(
  supabase: ReturnType<typeof adminClient>,
  roomId: string,
  rematchSequence: number,
  playerId: string,
  mutate: (row: StatsRow) => void,
) {
  for (const target of [
    { table: 'syh_room_player_stats' as const, sequence: undefined },
    { table: 'syh_match_player_stats' as const, sequence: rematchSequence },
  ]) {
    const row = await loadStatsRow(
      supabase,
      target.table,
      roomId,
      playerId,
      target.sequence,
    )
    mutate(row)
    await saveStatsRow(supabase, target.table, row)
  }
}

async function updateStats(
  supabase: ReturnType<typeof adminClient>,
  roomId: string,
  rematchSequence: number,
  before: GameState,
  after: GameState,
  action: Action,
) {
  const actor = actionPlayerId(action) ?? actorId(before)
  if (actor) {
    const playedAttack =
      action.type === 'CONFIRM_ATTACK' ||
      (action.type === 'SELECT_CARD' && before.catalog[action.cardId]?.kind === 'skip')
    const defended =
      action.type === 'RESPOND_DEFENSE' && action.response !== 'accept'
    const blankDefense =
      (action.type === 'RESPOND_DEFENSE' && action.response === 'blank') ||
      (action.type === 'RESPOND_REVERSE_BLANK' && action.response === 'blank')

    if (playedAttack || defended || blankDefense) {
      await bumpStats(supabase, roomId, rematchSequence, actor, (row) => {
        if (playedAttack) {
          row.attacks_played += 1
          row.specials_played += 1
        }
        if (defended) row.defenses_played += 1
        if (blankDefense) row.blank_defenses += 1
      })
    }
  }

  const beforeEnded = before.phase.type === 'round_over' || before.phase.type === 'match_over'
  const afterEnded = after.phase.type === 'round_over' || after.phase.type === 'match_over'
  if (!beforeEnded && afterEnded) {
    const winnerId = after.phase.winnerId
    await bumpStats(supabase, roomId, rematchSequence, winnerId, (row) => {
      row.rounds_won += 1
      if (after.phase.type === 'match_over') row.match_wins += 1
    })
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const apiKey = req.headers.get('apikey')
  if (
    !validPublicApiKey(
      apiKey,
      Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'),
      Deno.env.get('SUPABASE_ANON_KEY'),
    )
  ) {
    return json({ error: 'Invalid apikey' }, 401)
  }

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

      const cumulativeSeeds = players.map((player) =>
        emptyStats(roomId, player.game_player_id),
      )
      const matchSeeds = players.map((player) =>
        emptyStats(roomId, player.game_player_id, Number(room.rematch_sequence ?? 0)),
      )

      const { error: cumulativeError } = await supabase
        .from('syh_room_player_stats')
        .upsert(cumulativeSeeds, {
          onConflict: 'room_id,game_player_id',
          ignoreDuplicates: true,
        })
      if (cumulativeError) throw cumulativeError

      const { error: matchError } = await supabase
        .from('syh_match_player_stats')
        .upsert(matchSeeds, {
          onConflict: 'room_id,rematch_sequence,game_player_id',
        })
      if (matchError) throw matchError

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
      const protocolError = onlineActionError(before, action)
      if (protocolError) return json({ error: protocolError }, 400)

      const expectedActor = actorId(before)
      if (before.phase.type !== 'round_over') {
        if (!expectedActor || expectedActor !== member.game_player_id) {
          return json({ error: 'NOT_YOUR_TURN' }, 403)
        }
      }

      const claimedPlayer = actionPlayerId(action)
      if (claimedPlayer && claimedPlayer !== member.game_player_id) {
        return json({ error: 'PLAYER_MISMATCH' }, 403)
      }

      const after = reduce(before, action)
      const blocked = after.history.at(-1)?.startsWith('Action blocked:')
      if (blocked) {
        return json({
          error: after.history.at(-1)?.replace('Action blocked: ', '') ?? 'Illegal move',
        }, 400)
      }

      const invariantError = onlineStateInvariantError(before, after)
      if (invariantError) return json({ error: invariantError }, 409)

      const { data: nextVersion, error: commitError } = await supabase.rpc(
        'syh_commit_authoritative_state',
        {
          p_room_id: roomId,
          p_expected_version: expectedVersion,
          p_game_state: after,
        },
      )
      if (commitError) {
        const message = commitError.message?.includes('STALE_STATE')
          ? 'STALE_STATE'
          : commitError.message
        return json({ error: message }, 409)
      }

      const rematchSequence = Number(room.rematch_sequence ?? 0)
      await updateStats(
        supabase,
        roomId,
        rematchSequence,
        before,
        after,
        action,
      )

      if (after.phase.type === 'match_over') {
        const winner = after.players.find((player) => player.id === after.phase.winnerId)
        const { data: stats } = await supabase
          .from('syh_match_player_stats')
          .select('*')
          .eq('room_id', roomId)
          .eq('rematch_sequence', rematchSequence)

        await supabase.from('syh_match_results').upsert({
          room_id: roomId,
          rematch_sequence: rematchSequence,
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
