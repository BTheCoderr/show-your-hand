import { allCardIds, assertConservation, createCatalog } from './deck'
import {
  cloneState,
  currentPlayer,
  dropColorFromHand,
  firstQualifying,
  log,
  nameOf,
  nextOpponent,
  orderTargetsClockwise,
  playerById,
  playerScore,
  refillAll,
  spendFromHand,
} from './helpers'
import { seedFrom, shuffleInPlace } from './rng'
import type {
  Action,
  AttackKind,
  Color,
  DefenseChoice,
  GameState,
  PendingAttack,
  Player,
  PlayerId,
} from './types'
import { MATCH_POINT_GOAL } from './types'

export function emptyMenuState(testMode = false): GameState {
  return {
    version: 1,
    catalog: createCatalog(),
    players: [],
    drawPile: [],
    discardPile: [],
    currentPlayerIndex: 0,
    roundStarterIndex: 0,
    skippedPlayerId: null,
    phase: { type: 'menu' },
    revealedUntilTurnEnd: [],
    history: [],
    testMode,
    matchPointGoal: MATCH_POINT_GOAL,
    rngState: seedFrom(),
    selectedCardId: null,
  }
}

function makePlayers(opponentCount: 1 | 2 | 3): Player[] {
  const players: Player[] = [{ id: 'human', name: 'You', isHuman: true, hand: [], score: 0 }]
  for (let i = 1; i <= opponentCount; i++) {
    players.push({
      id: `cpu-${i}`,
      name: `CPU ${i}`,
      isHuman: false,
      hand: [],
      score: 0,
    })
  }
  return players
}

function dealRound(state: GameState, firstIndex: number): void {
  const ids = shuffleInPlace(allCardIds(state.catalog), state)
  state.drawPile = ids
  state.discardPile = []
  for (const player of state.players) player.hand = []
  for (let i = 0; i < 5; i++) {
    for (const player of state.players) {
      const card = state.drawPile.shift()
      if (!card) throw new Error('Deck exhausted while dealing')
      player.hand.push(card)
    }
  }
  state.currentPlayerIndex = firstIndex
  state.roundStarterIndex = firstIndex
  state.skippedPlayerId = null
  state.revealedUntilTurnEnd = []
  state.selectedCardId = null
  state.phase = { type: 'choose_action' }
  assertConservation(state)
}

function startMatch(
  opponentCount: 1 | 2 | 3,
  testMode = false,
  seed?: number,
): GameState {
  const state = emptyMenuState(testMode)
  state.rngState = seedFrom(seed)
  state.players = makePlayers(opponentCount)
  dealRound(state, 0)
  log(
    state,
    `Match started — you vs ${opponentCount} computer opponent${opponentCount === 1 ? '' : 's'}. First to ${MATCH_POINT_GOAL} wins.`,
  )
  log(state, `${currentPlayer(state).name} starts the round.`)
  return state
}

function isAttackKind(kind: string): kind is AttackKind {
  return (
    kind === 'show-your-hand' ||
    kind === 'drop-color' ||
    kind === 'skip' ||
    kind === 'shuffle'
  )
}

export function legalTargets(state: GameState, attackerId: PlayerId): PlayerId[] {
  return state.players.filter((player) => player.id !== attackerId).map((player) => player.id)
}

export function validDefenseChoices(
  state: GameState,
  playerId: PlayerId,
  kind: AttackKind,
): DefenseChoice[] {
  const hand = playerById(state, playerId).hand.map((id) => state.catalog[id])
  const choices: DefenseChoice[] = ['accept']
  if (hand.some((card) => card.kind === 'blank')) choices.push('blank')
  if (hand.some((card) => card.kind === kind)) choices.push('counter')
  return choices
}

function validateAttack(
  state: GameState,
  playerId: PlayerId,
  cardId: string,
  targetIds: PlayerId[],
  color?: Color,
): PendingAttack {
  const player = playerById(state, playerId)
  if (player.id !== currentPlayer(state).id) throw new Error('Not your turn')
  if (!player.hand.includes(cardId)) throw new Error('Card is not in hand')
  const card = state.catalog[cardId]
  if (!isAttackKind(card.kind)) throw new Error('That card is not an attack')

  const others = new Set(legalTargets(state, playerId))
  let targets = [...targetIds]
  if (card.kind === 'skip') {
    targets = [nextOpponent(state, playerId).id]
  } else if (card.kind === 'show-your-hand' || card.kind === 'drop-color') {
    if (targets.length !== 1 || !others.has(targets[0])) {
      throw new Error('Choose one other player')
    }
  } else if (card.kind === 'shuffle') {
    if (targets.length < 1 || targets.length > 2) {
      throw new Error('Shuffle must target one or two opponents')
    }
    if (new Set(targets).size !== targets.length) throw new Error('Duplicate shuffle target')
    if (targets.some((id) => !others.has(id))) throw new Error('Invalid shuffle target')
  }

  if (card.kind === 'drop-color' && !color) {
    throw new Error('Choose a color to drop')
  }

  return {
    attackerId: playerId,
    cardId,
    kind: card.kind,
    targetIds: orderTargetsClockwise(state, playerId, targets),
    color,
    responses: {},
  }
}

function beginDefense(state: GameState, attack: PendingAttack): void {
  const next = attack.targetIds.find((id) => !attack.responses[id])
  if (!next) {
    resolveAttack(state, attack)
    return
  }
  state.phase = { type: 'await_defense', attack, responderId: next }
}

function applyDeclare(state: GameState, playerId: PlayerId): void {
  const result = playerScore(state, playerId)
  if (!result) throw new Error('That hand does not score')
  const player = playerById(state, playerId)
  player.score += result.points
  log(
    state,
    `${player.name} declared ${result.label} and scored ${result.points} point${result.points === 1 ? '' : 's'} (total ${player.score}).`,
  )
  if (player.score >= state.matchPointGoal) {
    state.phase = { type: 'match_over', winnerId: player.id }
    log(state, `${player.name} wins the match.`)
    return
  }
  state.phase = {
    type: 'round_over',
    winnerId: player.id,
    points: result.points,
    combo: result.combo,
    label: result.label,
  }
  log(state, 'Round over. Collect the deck and deal again.')
}

function openDeclareWindow(state: GameState, skipIds: Set<PlayerId> = new Set()): void {
  const from = currentPlayer(state)
  const next = firstQualifying(state, from.id, skipIds)
  if (!next) {
    if (state.revealedUntilTurnEnd.length > 0) {
      state.phase = { type: 'review_hands' }
      log(state, 'Revealed hands stay visible until this turn ends.')
      return
    }
    endTurn(state)
    return
  }
  if (next.isHuman) {
    state.phase = { type: 'may_declare', playerId: next.id }
    log(state, `${next.name} may declare a winning hand.`)
    return
  }
  applyDeclare(state, next.id)
}

function endTurn(state: GameState): void {
  state.revealedUntilTurnEnd = []
  state.selectedCardId = null
  let next = (state.currentPlayerIndex + 1) % state.players.length
  const skipped = state.skippedPlayerId
  state.skippedPlayerId = null
  if (skipped && state.players[next].id === skipped) {
    log(state, `${state.players[next].name} is skipped.`)
    next = (next + 1) % state.players.length
  }
  state.currentPlayerIndex = next
  state.phase = { type: 'choose_action' }
  log(state, `${currentPlayer(state).name}'s turn.`)
}

function afterActionResolved(state: GameState): void {
  refillAll(state)
  openDeclareWindow(state)
}

function resolveShowYourHand(state: GameState, attack: PendingAttack): void {
  for (const targetId of attack.targetIds) {
    const response = attack.responses[targetId]
    if (response?.type === 'blank') {
      log(state, `${nameOf(state, targetId)} blocked Show Your Hand with Blank.`)
      continue
    }
    if (!state.revealedUntilTurnEnd.includes(targetId)) {
      state.revealedUntilTurnEnd.push(targetId)
    }
    log(
      state,
      `${nameOf(state, targetId)} must show their hand to everyone until this turn ends.`,
    )
  }
}

function resolveSkip(state: GameState, attack: PendingAttack): void {
  const targetId = attack.targetIds[0]
  const response = attack.responses[targetId]
  if (response?.type === 'blank' || response?.type === 'counter') {
    log(
      state,
      `Skip is cancelled. ${nameOf(state, targetId)} will take their normal next turn.`,
    )
    return
  }
  state.skippedPlayerId = targetId
  log(state, `${nameOf(state, targetId)} will be skipped.`)
}

function resolveShuffle(state: GameState, attack: PendingAttack): void {
  const affected = new Set(attack.targetIds)
  for (const targetId of attack.targetIds) {
    const response = attack.responses[targetId]
    if (response?.type === 'blank') {
      affected.delete(targetId)
      log(state, `${nameOf(state, targetId)} blocked Shuffle with Blank.`)
    } else if (response?.type === 'counter') {
      affected.delete(targetId)
      affected.add(attack.attackerId)
      log(
        state,
        `${nameOf(state, targetId)} countered Shuffle — they keep their hand and ${nameOf(state, attack.attackerId)} is added to the shuffle.`,
      )
    }
  }

  const order = orderTargetsClockwise(
    state,
    attack.attackerId,
    [...affected].filter((id) => id !== attack.attackerId),
  )
  if (affected.has(attack.attackerId)) order.push(attack.attackerId)

  if (order.length === 0) {
    log(state, 'No hands were shuffled.')
    return
  }

  const returned: string[] = []
  for (const id of order) {
    const player = playerById(state, id)
    returned.push(...player.hand)
    player.hand = []
  }
  state.drawPile.push(...returned)
  shuffleInPlace(state.drawPile, state)
  for (const id of order) {
    const player = playerById(state, id)
    while (player.hand.length < 5) {
      player.hand.push(state.drawPile.shift() as string)
    }
    log(state, `${player.name} received a new five-card hand.`)
  }
}

function resolveDropColorSuccess(state: GameState, targetId: PlayerId, color: Color): void {
  const dropped = dropColorFromHand(state, targetId, color)
  if (dropped.length === 0) {
    log(state, `${nameOf(state, targetId)} had no ${color} number cards.`)
  } else {
    log(
      state,
      `${nameOf(state, targetId)} dropped ${dropped.length} ${color} card${dropped.length === 1 ? '' : 's'}.`,
    )
  }
}

function resolveAttack(state: GameState, attack: PendingAttack): void {
  if (attack.kind === 'show-your-hand') {
    resolveShowYourHand(state, attack)
    afterActionResolved(state)
    return
  }
  if (attack.kind === 'skip') {
    resolveSkip(state, attack)
    afterActionResolved(state)
    return
  }
  if (attack.kind === 'shuffle') {
    resolveShuffle(state, attack)
    afterActionResolved(state)
    return
  }

  const targetId = attack.targetIds[0]
  const response = attack.responses[targetId]
  const color = attack.color
  if (!color) throw new Error('Drop Color is missing a color')

  if (response?.type === 'blank') {
    log(state, `${nameOf(state, targetId)} blocked Drop Color with Blank.`)
    afterActionResolved(state)
    return
  }
  if (response?.type === 'counter') {
    state.phase = { type: 'choose_reverse_color', attack, reverserId: targetId }
    log(
      state,
      `${nameOf(state, targetId)} reversed Drop Color. They choose a color for ${nameOf(state, attack.attackerId)}.`,
    )
    return
  }
  resolveDropColorSuccess(state, targetId, color)
  afterActionResolved(state)
}

function discardCard(state: GameState, playerId: PlayerId, cardId: string): void {
  if (currentPlayer(state).id !== playerId) throw new Error('Not your turn')
  if (state.phase.type !== 'choose_action' && state.phase.type !== 'choose_targets') {
    throw new Error('Cannot discard now')
  }
  spendFromHand(state, playerId, cardId)
  const card = state.catalog[cardId]
  const label = card.kind === 'number' ? `${card.color} ${card.number}` : card.kind.replace(/-/g, ' ')
  log(state, `${nameOf(state, playerId)} discarded ${label}.`)
  state.selectedCardId = null
  afterActionResolved(state)
}

function playAttack(state: GameState, attack: PendingAttack): void {
  spendFromHand(state, attack.attackerId, attack.cardId)
  const label = attack.kind.replace(/-/g, ' ')
  const targets = attack.targetIds.map((id) => nameOf(state, id)).join(' and ')
  const colorBit = attack.color ? ` (${attack.color})` : ''
  log(state, `${nameOf(state, attack.attackerId)} played ${label} on ${targets}${colorBit}.`)
  state.selectedCardId = null
  beginDefense(state, attack)
}

function applyDefense(
  state: GameState,
  playerId: PlayerId,
  choice: DefenseChoice,
  cardId?: string,
): void {
  if (state.phase.type !== 'await_defense' || state.phase.responderId !== playerId) {
    throw new Error('Not your defense window')
  }
  const attack = state.phase.attack
  const legal = validDefenseChoices(state, playerId, attack.kind)
  if (!legal.includes(choice)) throw new Error('Illegal defense')

  if (choice === 'accept') {
    attack.responses[playerId] = { type: 'accept' }
    log(state, `${nameOf(state, playerId)} accepted the attack.`)
  } else if (choice === 'blank') {
    const id =
      cardId ??
      playerById(state, playerId).hand.find((item) => state.catalog[item].kind === 'blank')
    if (!id || state.catalog[id].kind !== 'blank') throw new Error('No Blank to play')
    spendFromHand(state, playerId, id)
    attack.responses[playerId] = { type: 'blank', cardId: id }
    log(state, `${nameOf(state, playerId)} played Blank.`)
  } else {
    const id =
      cardId ??
      playerById(state, playerId).hand.find((item) => state.catalog[item].kind === attack.kind)
    if (!id || state.catalog[id].kind !== attack.kind) {
      throw new Error(`No ${attack.kind} to counter with`)
    }
    spendFromHand(state, playerId, id)
    attack.responses[playerId] = { type: 'counter', cardId: id }
    log(state, `${nameOf(state, playerId)} played ${attack.kind.replace(/-/g, ' ')} as a counter.`)
  }

  beginDefense(state, attack)
}

function applyReverseColor(state: GameState, playerId: PlayerId, color: Color): void {
  if (state.phase.type !== 'choose_reverse_color' || state.phase.reverserId !== playerId) {
    throw new Error('Not your reverse')
  }
  const { attack } = state.phase
  state.phase = {
    type: 'await_reverse_blank',
    attack,
    reverserId: playerId,
    reverseColor: color,
  }
  log(
    state,
    `${nameOf(state, playerId)} named ${color}. ${nameOf(state, attack.attackerId)} may Blank.`,
  )
}

function applyReverseBlank(
  state: GameState,
  playerId: PlayerId,
  choice: 'accept' | 'blank',
  cardId?: string,
): void {
  if (state.phase.type !== 'await_reverse_blank' || state.phase.attack.attackerId !== playerId) {
    throw new Error('Not your blank window')
  }
  const { attack, reverseColor } = state.phase
  if (choice === 'blank') {
    const id =
      cardId ??
      playerById(state, playerId).hand.find((item) => state.catalog[item].kind === 'blank')
    if (!id) throw new Error('No Blank to play')
    spendFromHand(state, playerId, id)
    log(state, `${nameOf(state, playerId)} blocked the reverse Drop Color with Blank.`)
  } else {
    resolveDropColorSuccess(state, playerId, reverseColor)
  }
  void attack
  afterActionResolved(state)
}

function selectCard(state: GameState, playerId: PlayerId, cardId: string): void {
  if (state.phase.type !== 'choose_action') throw new Error('Cannot select a card now')
  if (currentPlayer(state).id !== playerId) throw new Error('Not your turn')
  const player = playerById(state, playerId)
  if (!player.hand.includes(cardId)) throw new Error('Card is not in hand')
  const card = state.catalog[cardId]

  if (card.kind === 'number' || card.kind === 'blank') {
    discardCard(state, playerId, cardId)
    return
  }
  if (card.kind === 'skip') {
    playAttack(state, validateAttack(state, playerId, cardId, [], undefined))
    return
  }
  state.selectedCardId = cardId
  state.phase = { type: 'choose_targets', cardId }
}

function nextRound(state: GameState): void {
  if (state.phase.type !== 'round_over') throw new Error('No round to continue')
  const nextStarter = (state.roundStarterIndex + 1) % state.players.length
  dealRound(state, nextStarter)
  log(state, `New round. ${currentPlayer(state).name} starts.`)
}

export function reduce(state: GameState, action: Action): GameState {
  if (action.type === 'START_MATCH') {
    return startMatch(action.opponentCount, action.testMode, action.seed)
  }
  if (action.type === 'RESTART') {
    return emptyMenuState(state.testMode)
  }
  if (action.type === 'TOGGLE_TEST_MODE') {
    const next = cloneState(state)
    next.testMode = !next.testMode
    log(next, next.testMode ? 'Test mode on — all hands visible.' : 'Test mode off.')
    return next
  }

  const next = cloneState(state)
  try {
    switch (action.type) {
      case 'SELECT_CARD':
        selectCard(next, action.playerId, action.cardId)
        break
      case 'CANCEL_SELECTION':
        next.selectedCardId = null
        if (next.phase.type === 'choose_targets') next.phase = { type: 'choose_action' }
        break
      case 'CONFIRM_ATTACK':
        playAttack(
          next,
          validateAttack(next, action.playerId, action.cardId, action.targetIds, action.color),
        )
        break
      case 'RESPOND_DEFENSE':
        applyDefense(next, action.playerId, action.response, action.cardId)
        break
      case 'CHOOSE_REVERSE_COLOR':
        applyReverseColor(next, action.playerId, action.color)
        break
      case 'RESPOND_REVERSE_BLANK':
        applyReverseBlank(next, action.playerId, action.response, action.cardId)
        break
      case 'DECLARE':
        if (
          (next.phase.type === 'choose_action' && currentPlayer(next).id === action.playerId) ||
          (next.phase.type === 'may_declare' && next.phase.playerId === action.playerId)
        ) {
          applyDeclare(next, action.playerId)
        } else {
          throw new Error('Cannot declare now')
        }
        break
      case 'PASS_DECLARE':
        if (next.phase.type !== 'may_declare' || next.phase.playerId !== action.playerId) {
          throw new Error('Cannot pass this declaration')
        }
        log(next, `${nameOf(next, action.playerId)} passed on declaring.`)
        openDeclareWindow(next, new Set([action.playerId]))
        break
      case 'CONTINUE':
        if (next.phase.type !== 'review_hands') throw new Error('Nothing to continue')
        endTurn(next)
        break
      case 'NEXT_ROUND':
        nextRound(next)
        break
      default:
        throw new Error('Unknown action')
    }
    assertConservation(next)
    return next
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const rejected = cloneState(state)
    log(rejected, `Action blocked: ${message}`)
    rejected.selectedCardId = state.selectedCardId
    return rejected
  }
}

export function actorId(state: GameState): PlayerId | null {
  switch (state.phase.type) {
    case 'choose_action':
      return currentPlayer(state).id
    case 'choose_targets':
      return currentPlayer(state).id
    case 'await_defense':
      return state.phase.responderId
    case 'choose_reverse_color':
      return state.phase.reverserId
    case 'await_reverse_blank':
      return state.phase.attack.attackerId
    case 'may_declare':
      return state.phase.playerId
    case 'review_hands':
      return state.players.find((player) => player.isHuman)?.id ?? currentPlayer(state).id
    default:
      return null
  }
}

export function needsHumanInput(state: GameState): boolean {
  const id = actorId(state)
  if (!id) return false
  return playerById(state, id).isHuman
}

export function canDeclare(state: GameState, playerId: PlayerId): boolean {
  if (!playerScore(state, playerId)) return false
  if (state.phase.type === 'choose_action' && currentPlayer(state).id === playerId) return true
  if (state.phase.type === 'may_declare' && state.phase.playerId === playerId) return true
  return false
}

export function instructionFor(state: GameState): string {
  const phase = state.phase
  switch (phase.type) {
    case 'menu':
      return 'Choose how many computer opponents to face, then start the match.'
    case 'choose_action': {
      const you = currentPlayer(state)
      if (you.isHuman) {
        return canDeclare(state, you.id)
          ? 'Your turn. Declare your hand, play a special, or discard a card.'
          : 'Your turn. Play one special or discard one card, then draw back to five.'
      }
      return `${you.name} is thinking…`
    }
    case 'choose_targets': {
      const card = state.catalog[phase.cardId]
      if (card.kind === 'drop-color') return 'Choose a player and a color for Drop Color.'
      if (card.kind === 'shuffle') return 'Choose one or two opponents to shuffle, then confirm.'
      return 'Choose a player to reveal.'
    }
    case 'await_defense':
      return `${nameOf(state, phase.responderId)} must respond to ${phase.attack.kind.replace(/-/g, ' ')}.`
    case 'choose_reverse_color':
      return `${nameOf(state, phase.reverserId)}: name a color for the reverse Drop Color.`
    case 'await_reverse_blank':
      return `${nameOf(state, phase.attack.attackerId)}: Blank the reverse or accept it.`
    case 'may_declare':
      return `${nameOf(state, phase.playerId)} may declare a winning hand, or pass.`
    case 'review_hands':
      return 'A hand is revealed until this turn ends. Continue when you have read it.'
    case 'round_over':
      return `${nameOf(state, phase.winnerId)} scored ${phase.points} (${phase.label}). Deal the next round.`
    case 'match_over':
      return `${nameOf(state, phase.winnerId)} reached ${state.matchPointGoal} points and wins the match.`
  }
}

export function countInPlay(state: GameState): number {
  return (
    state.players.reduce((sum, player) => sum + player.hand.length, 0) +
    state.drawPile.length +
    state.discardPile.length
  )
}
