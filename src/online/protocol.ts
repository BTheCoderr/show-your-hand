import type { Action, GameState } from '../game/types'

type PhaseType = GameState['phase']['type']
type ActionType = Action['type']

const ALLOWED_BY_PHASE: Record<PhaseType, readonly ActionType[]> = {
  menu: [],
  choose_action: ['SELECT_CARD', 'TAKE_DISCARD', 'DECLARE'],
  choose_targets: ['CANCEL_SELECTION', 'CONFIRM_ATTACK'],
  await_defense: ['RESPOND_DEFENSE'],
  claim_dropped: ['CLAIM_DROPPED'],
  trim_hand: ['TRIM_HAND'],
  choose_reverse_color: ['CHOOSE_REVERSE_COLOR'],
  await_reverse_blank: ['RESPOND_REVERSE_BLANK'],
  may_declare: ['DECLARE', 'PASS_DECLARE'],
  review_hands: ['CONTINUE'],
  round_over: ['NEXT_ROUND'],
  match_over: [],
}

export const FORBIDDEN_ONLINE_ACTIONS = [
  'START_MATCH',
  'RESTART',
  'TOGGLE_TEST_MODE',
] as const satisfies readonly ActionType[]

export function onlineActionError(state: GameState, action: Action): string | null {
  if ((FORBIDDEN_ONLINE_ACTIONS as readonly string[]).includes(action.type)) {
    return `${action.type} is not available in online matches`
  }

  const allowed = ALLOWED_BY_PHASE[state.phase.type]
  if (!allowed.includes(action.type)) {
    return `${action.type} is not allowed during ${state.phase.type}`
  }

  return null
}

export const MIN_TABLE_PLAYERS = 2
export const MAX_TABLE_PLAYERS = 7

export function seatGamePlayerId(seat: number): string {
  if (!Number.isInteger(seat) || seat < 0 || seat > MAX_TABLE_PLAYERS - 1) {
    throw new Error('Seat is outside the seven-player table')
  }
  return seat === 0 ? 'human' : `cpu-${seat}`
}

export function onlineRosterError(
  players: { seat: number; gamePlayerId: string; ready: boolean }[],
  maxPlayers: number,
): string | null {
  if (!Number.isInteger(maxPlayers) || maxPlayers < MIN_TABLE_PLAYERS || maxPlayers > MAX_TABLE_PLAYERS) {
    return 'Tables hold two to seven players'
  }
  if (players.length !== maxPlayers) return 'Every seat at this table must be filled before the deal'
  if (!players.every((player) => player.ready)) return 'Every player must be ready'
  const ordered = [...players].sort((a, b) => a.seat - b.seat)
  for (let seat = 0; seat < ordered.length; seat += 1) {
    if (ordered[seat].seat !== seat || ordered[seat].gamePlayerId !== seatGamePlayerId(seat)) {
      return 'Unexpected game player mapping'
    }
  }
  return null
}

export function onlineStateInvariantError(before: GameState, after: GameState): string | null {
  if (after.players.length < MIN_TABLE_PLAYERS || after.players.length > MAX_TABLE_PLAYERS) {
    return 'Online matches must keep between two and seven players'
  }
  if (after.players.map((player) => player.id).join('|') !== before.players.map((player) => player.id).join('|')) {
    return 'Online player identities cannot change during a match'
  }
  if (after.testMode) return 'Test mode is not available online'
  if (after.phase.type === 'menu') return 'Online matches cannot return to the menu through a game action'
  if (after.matchPointGoal !== before.matchPointGoal) return 'Match point goal cannot change during an online match'
  return null
}
