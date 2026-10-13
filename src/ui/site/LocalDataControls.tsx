import { useState } from 'react'
import { STORAGE_KEY as MATCH_STORAGE_KEY } from '../../game/persist'

const KEY_PREFIX = 'show-your-hand:'
const CACHE_PREFIX = 'show-your-hand'

export function localDataKeys(storage: Pick<Storage, 'length' | 'key'>): string[] {
  const keys: string[] = []
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)
    if (key && (key.startsWith(KEY_PREFIX) || key === MATCH_STORAGE_KEY)) keys.push(key)
  }
  return keys
}

export async function deleteLocalGameData(): Promise<number> {
  const keys = localDataKeys(window.localStorage)
  for (const key of keys) window.localStorage.removeItem(key)
  if ('caches' in window) {
    const names = await window.caches.keys()
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX)).map((name) => window.caches.delete(name)))
  }
  return keys.length
}

export function LocalDataControls() {
  const [status, setStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const [removed, setRemoved] = useState(0)

  const onDelete = async () => {
    const ok = window.confirm(
      'Delete SHOW YOUR HAND data stored in this browser? This removes your saved solo match, stats, settings, and any online seat token. If you are in an online room, you will lose your seat.',
    )
    if (!ok) return
    try {
      setRemoved(await deleteLocalGameData())
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="syh-local-data">
      <button type="button" className="syh-secondary" onClick={() => void onDelete()}>
        Delete game data in this browser
      </button>
      <p role="status" className="syh-local-data-status">
        {status === 'done'
          ? `Done. Removed ${removed} saved ${removed === 1 ? 'item' : 'items'} and the offline game cache from this browser.`
          : status === 'error'
            ? 'Your browser blocked access to site storage. Clear this site’s data from your browser settings instead.'
            : ''}
      </p>
    </div>
  )
}
