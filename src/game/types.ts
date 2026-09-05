export const COLORS = ['orange', 'blue', 'green', 'purple'] as const
export type Color = (typeof COLORS)[number]
export type NumberValue = 1 | 2 | 3 | 4 | 5

export const SPECIAL_KINDS = [
  'blank',
  'show-your-hand',
  'drop-color',
  'skip',
  'shuffle',
] as const
export type SpecialKind = (typeof SPECIAL_KINDS)[number]
export type AttackKind = Exclude<SpecialKind, 'blank'>

export type NumberCard = {
  id: string
  kind: 'number'
  color: Color
  number: NumberValue
  art: string
}

export type SpecialCard = {
  id: string
  kind: SpecialKind
  art: string
}

export type Card = NumberCard | SpecialCard

export type PlayerId = string

export type Player = {
  id: PlayerId
  name: string
  isHuman: boolean
  hand: string[]
  score: number
}

export type ComboName =
  | 'run-same-color'
  | 'five-color'
  | 'five-number'
  | 'run-mixed'

export type ScoreResult = {
  points: number
  combo: ComboName
  label: string
}

export type DefenseChoice = 'accept' | 'blank' | 'counter'

export type DefenseResponse =
  | { type: 'accept' }
  | { type: 'blank'; cardId: string }
  | { type: 'counter'; cardId: string }

export type PendingAttack = {
  attackerId: PlayerId
  cardId: string
  kind: AttackKind
  targetIds: PlayerId[]
  color?: Color
  responses: Partial<Record<PlayerId, DefenseResponse>>
}

export type Phase =
  | { type: 'menu' }
  | { type: 'choose_action' }
  | { type: 'choose_targets'; cardId: string }
  | { type: 'await_defense'; attack: PendingAttack; responderId: PlayerId }
  | { type: 'choose_reverse_color'; attack: PendingAttack; reverserId: PlayerId }
  | {
      type: 'await_reverse_blank'
      attack: PendingAttack
      reverserId: PlayerId
      reverseColor: Color
    }
  | { type: 'may_declare'; playerId: PlayerId }
  | { type: 'review_hands' }
  | { type: 'round_over'; winnerId: PlayerId; points: number; combo: ComboName; label: string }
  | { type: 'match_over'; winnerId: PlayerId }

export type GameState = {
  version: 1
  catalog: Record<string, Card>
  players: Player[]
  drawPile: string[]
  discardPile: string[]
  currentPlayerIndex: number
  roundStarterIndex: number
  skippedPlayerId: PlayerId | null
  phase: Phase
  revealedUntilTurnEnd: PlayerId[]
  history: string[]
  testMode: boolean
  matchPointGoal: number
  rngState: number
  selectedCardId: string | null
}

export type Action =
  | { type: 'START_MATCH'; opponentCount: 1 | 2 | 3; testMode?: boolean; seed?: number }
  | { type: 'SELECT_CARD'; playerId: PlayerId; cardId: string }
  | { type: 'CANCEL_SELECTION' }
  | {
      type: 'CONFIRM_ATTACK'
      playerId: PlayerId
      cardId: string
      targetIds: PlayerId[]
      color?: Color
    }
  | {
      type: 'RESPOND_DEFENSE'
      playerId: PlayerId
      response: DefenseChoice
      cardId?: string
    }
  | { type: 'CHOOSE_REVERSE_COLOR'; playerId: PlayerId; color: Color }
  | {
      type: 'RESPOND_REVERSE_BLANK'
      playerId: PlayerId
      response: 'accept' | 'blank'
      cardId?: string
    }
  | { type: 'DECLARE'; playerId: PlayerId }
  | { type: 'PASS_DECLARE'; playerId: PlayerId }
  | { type: 'CONTINUE' }
  | { type: 'NEXT_ROUND' }
  | { type: 'RESTART' }
  | { type: 'TOGGLE_TEST_MODE' }

export const MATCH_POINT_GOAL = 5

export const PLAYTEST_DEFAULTS = {
  syhRevealUntilTurnEnd: true,
  skipCounterCancelsOnly: true,
  resolveTargetsClockwise: true,
  shuffleCollectResponsesFirst: true,
  shuffleBlankProtectsOnlyUser: true,
  shuffleCounterAddsAttacker: true,
  shuffleEachAffectedOnce: true,
  shuffleNoFurtherChain: true,
  spentCardsExcludedFromShuffleReturn: true,
  refillBeforeDeclare: true,
  declarePriorityActiveThenClockwise: true,
  computersShareDeclareWindows: true,
  noPlayShort: true,
  recycleDiscardWhenDrawEmpty: true,
} as const
