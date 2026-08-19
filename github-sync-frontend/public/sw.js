// UMC-BCK service worker — deliberately minimal.
//
// This ONLY caches the static app shell (JS, CSS, icons, fonts) so the app
// can install and launch offline. It never caches anything from Supabase,
// Paystack, or any API call — this is a real-time financial app, and
// serving a stale wallet balance or stale order status from cache would be
// a genuine, dangerous bug, not a minor inconvenience. Every request that
// isn't a same-origin static asset always goes straight to the network.
//
// CRITICAL, real fix: navigation requests (index.html / '/') are now
// network-first, never cache-first. index.html references the current
// build's hashed JS filenames — serving a stale cached index.html after a
// new deploy points the browser at JS files that no longer exist on the
// server, and the whole app fails to mount, showing a blank page. Only
// content-hashed asset files (which are genuinely immutable — a new build
// always produces new filenames) are safe to cache-first.

const CACHE_NAME = 'umc-bck-shell-v5'
const SHELL_ASSETS = ['/manifest.json', '/icon-192.png', '/icon-512.png']

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

  // Real navigation requests (the HTML page itself, including SPA routes
  // that fall back to index.html) — always network-first. Falls back to a
  // cached copy only if genuinely offline, never as the default.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Genuinely immutable, content-hashed asset files only (JS/CSS bundles,
  // fonts) — safe to cache-first since a new deployment always produces
  // new filenames, never reusing an old one.
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

// Real push notification — shows a genuine OS-level alert whether the app
// is open, closed, or the phone is just sitting there, using whatever
// title/body/url the send-push-notification edge function sent.
self.addEventListener('push', (event) => {
  let data = { title: 'UMC-BCK', body: '', url: '/' }
  try {
    data = { ...data, ...event.data.json() }
  } catch {
    // Non-JSON push payload — fall back to the defaults above rather than
    // crash the handler.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url },
    })
  )
})

// Tapping the notification focuses an already-open tab if one exists,
// navigating it to the right place, rather than always opening a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
