import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const gameFiles = ['deck.ts', 'engine.ts', 'helpers.ts', 'rng.ts', 'scoring.ts', 'types.ts']

function normalizeGame(source) {
  return source
    .replace(/from '(\.\/[^']+)\.ts'/g, "from '$1'")
    .replace(/from "(\.\/[^"]+)\.ts"/g, 'from "$1"')
    .trim()
}

function normalizeProtocol(source) {
  return source
    .replace("from '../game/types'", "from '<game-types>'")
    .replace("from './game/types.ts'", "from '<game-types>'")
    .trim()
}

let failed = false

for (const file of gameFiles) {
  const browser = await readFile(resolve(root, 'src/game', file), 'utf8')
  const edge = await readFile(
    resolve(root, 'supabase/functions/show-your-hand-game/game', file),
    'utf8',
  )

  if (normalizeGame(browser) !== normalizeGame(edge)) {
    console.error(`Edge game engine drift: ${file}`)
    failed = true
  }
}

const browserProtocol = await readFile(resolve(root, 'src/online/protocol.ts'), 'utf8')
const edgeProtocol = await readFile(
  resolve(root, 'supabase/functions/show-your-hand-game/protocol.ts'),
  'utf8',
)

if (normalizeProtocol(browserProtocol) !== normalizeProtocol(edgeProtocol)) {
  console.error('Edge online protocol drift: protocol.ts')
  failed = true
}

if (failed) process.exit(1)
console.log('Browser and Edge Function game/protocol sources are in sync.')
