/**
 * October 2026 locked Standard Edition card taxonomy.
 * This module is independent from the currently deployed 70-card beta engine.
 */
export const REGULAR_COLORS = ['green', 'orange', 'yellow', 'red'] as const
export type RegularColor = (typeof REGULAR_COLORS)[number]
export type NumberValue77 = 1 | 2 | 3 | 4 | 5

export const SPECIAL_KINDS_77 = [
  'blank',
  'show-your-hand',
  'drop-color',
  'skip',
  'shuffle',
] as const
export type SpecialKind77 = (typeof SPECIAL_KINDS_77)[number]

export type RegularNumberCard77 = {
  id: string
  kind: 'number'
  color: RegularColor
  number: NumberValue77
  artPath: string
}

export type PurpleNumberCard77 = {
  id: string
  kind: 'purple'
  number: NumberValue77
  artPath: string
}

export type WildCard77 = {
  id: string
  kind: 'wild'
  artPath: string
}

export type SpecialCard77 = {
  id: string
  kind: SpecialKind77
  artPath: string
}

export type Card77 =
  | RegularNumberCard77
  | PurpleNumberCard77
  | WildCard77
  | SpecialCard77

export type Catalog77 = Record<string, Card77>
