// ExamGuru Service Worker — Push Notifications
const CACHE_NAME = 'examguru-v1'

self.addEventListener('install', e => self.skipWaiting())
self.addEventListener('activate', e => clients.claim())

// Handle push notifications
self.addEventListener('push', e => {
  let data = { title: 'ExamGuru', body: 'New notification', icon: '/favicon.svg' }
  try { data = { ...data, ...e.data.json() } } catch(err) {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon || '/favicon.svg',
      badge:   data.badge || '/favicon.svg',
      vibrate: [200, 100, 200],
      data:    data.data || {},
      actions: [
        { action: 'join', title: '📹 Join Call' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  )
})

// Handle notification click
self.addEventListener('notificationclick', e => {
  e.notification.close()
  if (e.action === 'dismiss') return
  const url = e.notification.data?.url || '/'
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const existing = cls.find(c => c.url.includes('examguru.duckdns.org'))
      if (existing) { existing.focus(); return }
      clients.openWindow('https://examguru.duckdns.org' + url)
    })
  )
})
