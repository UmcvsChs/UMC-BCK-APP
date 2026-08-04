// UMC-BCK service worker — deliberately minimal.
//
// This ONLY caches the static app shell (JS, CSS, icons, fonts) so the app
// can install and launch offline. It never caches anything from Supabase,
// Paystack, or any API call — this is a real-time financial app, and
// serving a stale wallet balance or stale order status from cache would be
// a genuine, dangerous bug, not a minor inconvenience. Every request that
// isn't a same-origin static asset always goes straight to the network.

const CACHE_NAME = 'umc-bck-shell-v1'
const SHELL_ASSETS = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Never intercept anything cross-origin (Supabase, Paystack, fonts CDN,
  // etc.) or anything that isn't a GET — those must always hit the real
  // network, never a cache.
  if (url.origin !== self.location.origin || event.request.method !== 'GET') {
    return
  }

  // Same-origin static assets only: cache-first, falling back to network
  // and caching the result for next time.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
    })
  )
})
