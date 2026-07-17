import { useEffect, useRef, useState } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import toast from 'react-hot-toast'
import { messaging } from '../../firebase-config'
import { useNotificationStore } from '../../features/notifications/store/useNotificationStore'
import api from '../../services/api'

export default function useFirebaseMessaging() {
  const [token, setToken] = useState(null)
  const [permission, setPermission] = useState(Notification.permission)
  const [error, setError] = useState(null)
  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator

  const addNotification = useNotificationStore(s => s.addNotification)
  const unsubRef = useRef(null)
  const registered = useRef(false)

  useEffect(() => {
    if (!isSupported || registered.current) return

    let cancelled = false

    async function setup() {
      try {
        const perm = await Notification.requestPermission()
        if (cancelled) return
        setPermission(perm)

        if (perm !== 'granted') {
          console.warn('[FCM] Permiso denegado')
          return
        }

        const fcmToken = await getToken(messaging, {
          vapidKey: 'BLXHQW9gt4Dn6FevAHRib__Q51li5bbqOptuehaG5j3QRFdYFrN4akC99tAstEQGHOvC2EQjYobTsNKuVSoB8n0',
        })
        if (cancelled) return

        if (!fcmToken) {
          console.warn('[FCM] Token vacío')
          return
        }

        setToken(fcmToken)
        registered.current = true

        api
          .post('/notifications/devices/register/', {
            token: fcmToken,
            platform: 'web',
          })
          .catch(err => {
            console.warn('[FCM] Error registrando token en backend:', err.message)
          })

        unsubRef.current = onMessage(messaging, payload => {
          const notif = payload.notification || {}
          const data = payload.data || {}
          const now = new Date().toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
          })

          addNotification({
            id: `fcm-${Date.now()}`,
            title: notif.title || 'El Patio',
            message: notif.body || '',
            variant: 'info',
            time: now,
            timestamp: new Date().toISOString(),
            data,
          })

          if (notif.body) {
            toast(notif.body, { icon: '🔔' })
          }
        })
      } catch (err) {
        if (cancelled) return
        console.error('[FCM] Error:', err.message)
        setError(err.message)
      }
    }

    setup()

    return () => {
      cancelled = true
      unsubRef.current?.()
    }
  }, [isSupported, addNotification])

  return { token, permission, error, isSupported }
}
