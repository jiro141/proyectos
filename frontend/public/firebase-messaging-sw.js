// Import Firebase SDK via CDN (requerido para service workers)
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

const firebaseConfig = {
  apiKey: 'AIzaSyDi1yPnksRHUOs1d80DcjW6HJmgPpjL5fg',
  authDomain: 'elpationotificaciones.firebaseapp.com',
  projectId: 'elpationotificaciones',
  storageBucket: 'elpationotificaciones.firebasestorage.app',
  messagingSenderId: '257910510655',
  appId: '1:257910510655:web:a74de4eed338259dec948a',
  measurementId: 'G-SHQCH33CC1',
}

firebase.initializeApp(firebaseConfig)

const messaging = firebase.messaging()

// ─── Push en background (app cerrada / tab no activo) ───
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Pizzería El Patio'
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/logo.png',
    badge: '/logo.png',
    data: payload.data || {},
    vibrate: [200, 100, 200],
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// ─── Click en la notificación ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = new URL('/', self.location.origin).href

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si ya hay una ventana abierta, la enfocamos
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }
      // Si no, abrimos una nueva
      return clients.openWindow(urlToOpen)
    })
  )
})
