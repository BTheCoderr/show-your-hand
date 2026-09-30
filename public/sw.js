const CACHE = 'show-your-hand-beta-0.1.1'
const CORE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/cards/back.png',
  '/cards/show-your-hand.png',
  '/cards/drop-color.png',
  '/cards/skip.png',
  '/cards/shuffle.png',
  '/cards/blank.png',
  '/cards/orange-1.png',
  '/cards/orange-2.png',
  '/cards/orange-3.png',
  '/cards/orange-4.png',
  '/cards/orange-5.png',
  '/cards/blue-1.png',
  '/cards/blue-2.png',
  '/cards/blue-3.png',
  '/cards/blue-4.png',
  '/cards/blue-5.png',
  '/cards/green-1.png',
  '/cards/green-2.png',
  '/cards/green-3.png',
  '/cards/green-4.png',
  '/cards/green-5.png',
  '/cards/purple-1.png',
  '/cards/purple-2.png',
  '/cards/purple-3.png',
  '/cards/purple-4.png',
  '/cards/purple-5.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put('/index.html', clone))
          return response
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, clone))
        }
        return response
      })
    }),
  )
})
