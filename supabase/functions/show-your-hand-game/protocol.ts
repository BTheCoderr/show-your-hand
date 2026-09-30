import type { Action, GameState } from './game/types.ts'

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

export function onlineStateInvariantError(before: GameState, after: GameState): string | null {
  if (after.players.length !== 2) return 'Online matches must keep exactly two players'
  if (after.players.map((player) => player.id).join('|') !== before.players.map((player) => player.id).join('|')) {
    return 'Online player identities cannot change during a match'
  }
  if (after.testMode) return 'Test mode is not available online'
  if (after.phase.type === 'menu') return 'Online matches cannot return to the menu through a game action'
  if (after.matchPointGoal !== before.matchPointGoal) return 'Match point goal cannot change during an online match'
  return null
}
