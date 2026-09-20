import { actorId, canDeclare, legalTargets, reduce, validDefenseChoices } from './engine'
import { cardsOf, handCards, playerById } from './helpers'
import { scoreHand } from './scoring'
import type { Action, Color, GameState, NumberCard, PlayerId } from './types'
import { COLORS } from './types'

/** Knowledge the computer is allowed to use — never hidden hands or the draw order. */
export function publicView(state: GameState, selfId: PlayerId) {
  const self = playerById(state, selfId)
  return {
    selfId,
    hand: cardsOf(state, self.hand),
    scores: Object.fromEntries(state.players.map((player) => [player.id, player.score])),
    discardTop: state.discardPile.at(-1) ?? null,
    discardCount: state.discardPile.length,
    drawCount: state.drawPile.length,
    revealedHands: Object.fromEntries(
      state.revealedUntilTurnEnd
        .filter((id) => id !== selfId)
        .map((id) => [id, handCards(state, id)]),
    ) as Record<PlayerId, ReturnType<typeof handCards>>,
    opponentIds: legalTargets(state, selfId),
  }
}

function keepValue(cards: ReturnType<typeof handCards>, cardId: string): number {
  const card = cards.find((item) => item.id === cardId)
  if (!card) return -1
  if (card.kind !== 'number') return card.kind === 'blank' ? 1.2 : 1.4
  const colorCount = cards.filter((item) => item.kind === 'number' && item.color === card.color)
    .length
  const numberCount = cards.filter(
    (item) => item.kind === 'number' && item.number === card.number,
  ).length
  const unique = new Set(
    cards.filter((item) => item.kind === 'number').map((item) => (item as NumberCard).number),
  )
  return colorCount * 3 + numberCount * 2 + (unique.has(card.number) ? 1 : 0)
}

function worstCardId(cards: ReturnType<typeof handCards>): string {
  return [...cards].sort((a, b) => keepValue(cards, a.id) - keepValue(cards, b.id))[0].id
}

function leadingOpponents(state: GameState, selfId: PlayerId): PlayerId[] {
  return [...state.players]
    .filter((player) => player.id !== selfId)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .map((player) => player.id)
}

function guessDropColor(view: ReturnType<typeof publicView>): Color {
  const revealed = Object.values(view.revealedHands)[0]
  if (revealed) {
    const counts = Object.fromEntries(COLORS.map((color) => [color, 0])) as Record<Color, number>
    for (const card of revealed) {
      if (card.kind === 'number') counts[card.color] += 1
    }
    return COLORS.slice().sort((a, b) => counts[b] - counts[a])[0]
  }
  const ownCounts = Object.fromEntries(COLORS.map((color) => [color, 0])) as Record<Color, number>
  for (const card of view.hand) {
    if (card.kind === 'number') ownCounts[card.color] += 1
  }
  return COLORS.slice().sort((a, b) => ownCounts[a] - ownCounts[b])[0]
}

function nearWin(cards: ReturnType<typeof handCards>): boolean {
  if (scoreHand(cards)) return true
  const numbers = cards.filter((card) => card.kind === 'number') as NumberCard[]
  if (numbers.length < 4) return false
  const byColor = COLORS.map(
    (color) => numbers.filter((card) => card.color === color).length,
  )
  const byNumber = [1, 2, 3, 4, 5].map(
    (value) => numbers.filter((card) => card.number === value).length,
  )
  const unique = new Set(numbers.map((card) => card.number))
  return Math.max(...byColor) >= 4 || Math.max(...byNumber) >= 4 || unique.size >= 4
}

function pickDefense(state: GameState, playerId: PlayerId): Action {
  if (state.phase.type !== 'await_defense') throw new Error('Not a defense window')
  const attack = state.phase.attack
  const legal = validDefenseChoices(state, playerId, attack.kind)
  const hand = handCards(state, playerId)
  const protect = nearWin(hand) || Boolean(scoreHand(hand))

  if (attack.kind === 'shuffle' && protect) {
    if (legal.includes('counter')) return { type: 'RESPOND_DEFENSE', playerId, response: 'counter' }
    if (legal.includes('blank')) return { type: 'RESPOND_DEFENSE', playerId, response: 'blank' }
  }
  if (attack.kind === 'drop-color' && attack.color) {
    const hit = hand.filter((card) => card.kind === 'number' && card.color === attack.color).length
    if (hit >= 2 || protect) {
      if (legal.includes('counter')) {
        return { type: 'RESPOND_DEFENSE', playerId, response: 'counter' }
      }
      if (legal.includes('blank')) return { type: 'RESPOND_DEFENSE', playerId, response: 'blank' }
    }
  }
  if (attack.kind === 'skip' && protect) {
    if (legal.includes('counter')) return { type: 'RESPOND_DEFENSE', playerId, response: 'counter' }
    if (legal.includes('blank')) return { type: 'RESPOND_DEFENSE', playerId, response: 'blank' }
  }
  if (attack.kind === 'show-your-hand' && protect && legal.includes('blank')) {
    return { type: 'RESPOND_DEFENSE', playerId, response: 'blank' }
  }
  return { type: 'RESPOND_DEFENSE', playerId, response: 'accept' }
}

function pickTurn(state: GameState, playerId: PlayerId): Action {
  if (canDeclare(state, playerId)) return { type: 'DECLARE', playerId }

  const view = publicView(state, playerId)
  const hand = view.hand

  if (hand.length === 5 && view.discardTop) {
    const top = state.catalog[view.discardTop]
    if (top?.kind === 'number') {
      const expanded = [...hand, top]
      const worst = worstCardId(expanded)
      if (worst !== top.id && keepValue(expanded, top.id) > keepValue(expanded, worst)) {
        return { type: 'TAKE_DISCARD', playerId }
      }
    }
  }
  const leaders = leadingOpponents(state, playerId)
  const discardId = worstCardId(hand)
  const discardCard = hand.find((card) => card.id === discardId)

  const attacks = hand.filter(
    (card) =>
      card.kind === 'show-your-hand' ||
      card.kind === 'drop-color' ||
      card.kind === 'skip' ||
      card.kind === 'shuffle',
  )

  const wantToCycle = discardCard && discardCard.kind !== 'number'
  const chaseNumbers = hand.filter((card) => card.kind === 'number').length >= 3

  if (attacks.length > 0 && (wantToCycle || chaseNumbers || scoreHand(hand) === null)) {
    const preferred =
      attacks.find((card) => card.kind === 'shuffle' && leaders[0] && view.scores[leaders[0]] > 0) ??
      attacks.find((card) => card.kind === 'skip') ??
      attacks.find((card) => card.kind === 'drop-color') ??
      attacks.find((card) => card.kind === 'show-your-hand') ??
      attacks[0]

    if (preferred.kind === 'skip') {
      return { type: 'SELECT_CARD', playerId, cardId: preferred.id }
    }
    if (preferred.kind === 'show-your-hand') {
      return {
        type: 'CONFIRM_ATTACK',
        playerId,
        cardId: preferred.id,
        targetIds: [leaders[0] ?? view.opponentIds[0]],
      }
    }
    if (preferred.kind === 'drop-color') {
      return {
        type: 'CONFIRM_ATTACK',
        playerId,
        cardId: preferred.id,
        targetIds: [leaders[0] ?? view.opponentIds[0]],
        color: guessDropColor(view),
      }
    }
    const targets = leaders.slice(0, Math.min(2, leaders.length))
    return {
      type: 'CONFIRM_ATTACK',
      playerId,
      cardId: preferred.id,
      targetIds: targets.length ? targets : view.opponentIds.slice(0, 1),
    }
  }

  return { type: 'SELECT_CARD', playerId, cardId: discardId }
}

export function chooseAiAction(state: GameState): Action {
  const id = actorId(state)
  if (!id) throw new Error('No actor for computer')
  if (playerById(state, id).isHuman) throw new Error('Human actor')

  switch (state.phase.type) {
    case 'choose_action':
      return pickTurn(state, id)
    case 'choose_targets': {
      const card = state.catalog[state.phase.cardId]
      const leaders = leadingOpponents(state, id)
      if (card.kind === 'drop-color') {
        return {
          type: 'CONFIRM_ATTACK',
          playerId: id,
          cardId: card.id,
          targetIds: [leaders[0]],
          color: guessDropColor(publicView(state, id)),
        }
      }
      if (card.kind === 'shuffle') {
        return {
          type: 'CONFIRM_ATTACK',
          playerId: id,
          cardId: card.id,
          targetIds: leaders.slice(0, Math.min(2, leaders.length)),
        }
      }
      return {
        type: 'CONFIRM_ATTACK',
        playerId: id,
        cardId: card.id,
        targetIds: [leaders[0]],
      }
    }
    case 'await_defense':
      return pickDefense(state, id)
    case 'claim_dropped':
      return {
        type: 'CLAIM_DROPPED',
        playerId: id,
        cardIds: [...state.phase.cardIds],
      }
    case 'trim_hand': {
      const cards = handCards(state, id)
      const excess = Math.max(0, cards.length - 5)
      const discardIds = [...cards]
        .sort((a, b) => keepValue(cards, a.id) - keepValue(cards, b.id))
        .slice(0, excess)
        .map((card) => card.id)
      return { type: 'TRIM_HAND', playerId: id, cardIds: discardIds }
    }
    case 'choose_reverse_color':
      return {
        type: 'CHOOSE_REVERSE_COLOR',
        playerId: id,
        color: guessDropColor(publicView(state, id)),
      }
    case 'await_reverse_blank': {
      const color = state.phase.reverseColor
      const held = handCards(state, id).filter(
        (card) => card.kind === 'number' && card.color === color,
      ).length
      const hasBlank = handCards(state, id).some((card) => card.kind === 'blank')
      if (hasBlank && (held >= 2 || nearWin(handCards(state, id)))) {
        return { type: 'RESPOND_REVERSE_BLANK', playerId: id, response: 'blank' }
      }
      return { type: 'RESPOND_REVERSE_BLANK', playerId: id, response: 'accept' }
    }
    case 'may_declare':
      return canDeclare(state, id)
        ? { type: 'DECLARE', playerId: id }
        : { type: 'PASS_DECLARE', playerId: id }
    case 'review_hands':
      return { type: 'CONTINUE' }
    default:
      throw new Error(`Computer has no move in phase ${state.phase.type}`)
  }
}

export function reduceStrict(state: GameState, action: Action): GameState {
  const next = reduce(state, action)
  const last = next.history.at(-1) ?? ''
  if (last.startsWith('Action blocked:')) {
    throw new Error(last)
  }
  return next
}

export function advanceComputers(state: GameState, maxSteps = 48): GameState {
  let current = state
  for (let i = 0; i < maxSteps; i++) {
    const id = actorId(current)
    if (!id) break
    if (playerById(current, id).isHuman) break
    current = reduceStrict(current, chooseAiAction(current))
  }
  return current
}

export function isHiddenFromAi(state: GameState, viewerId: PlayerId, ownerId: PlayerId): boolean {
  if (viewerId === ownerId) return false
  if (state.revealedUntilTurnEnd.includes(ownerId)) return false
  return true
}
