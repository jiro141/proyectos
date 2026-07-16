import { useEffect, useRef } from 'react'
import { useAuthStore } from '../../features/auth/store/useAuthStore'
import { useNotificationStore } from '../../features/notifications/store/useNotificationStore'
import api from '../../services/api'

export default function usePushNotifications() {
  const token = useAuthStore(s => s.token)
  const addNotification = useNotificationStore(s => s.addNotification)
  const registered = useRef(false)

  useEffect(() => {
    if (!token || registered.current) return

    let cancelled = false

    async function setup() {
      try {
        // Solo funciona en dispositivo real o emulador con Google Play Services
        const { PushNotifications } = await import('@capacitor/push-notifications')

        // Solicitar permiso
        let permResult = await PushNotifications.requestPermissions()
        if (permResult.receive === 'denied') {
          console.warn('[Push] Permiso denegado')
          return
        }

        // Registrar en FCM
        await PushNotifications.register()
        registered.current = true

        // Escuchar el token
        PushNotifications.addListener('registration', (event) => {
          const deviceToken = event.value
          console.log('[Push] Token recibido:', deviceToken.slice(0, 20) + '...')

          // Enviar token al backend
          api.post('/notifications/devices/register/', {
            token: deviceToken,
            platform: 'android',
          }).catch(err => {
            console.error('[Push] Error registrando token:', err)
          })
        })

        // Escuchar notificaciones recibidas (app en primer plano)
        PushNotifications.addListener('pushNotificationReceived', (event) => {
          console.log('[Push] Recibida:', event.title)
          addNotification({
            id: `push-${Date.now()}`,
            title: event.title || 'Notificación',
            message: event.body || '',
            variant: 'info',
            time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date().toISOString(),
          })
        })

        // Escuchar cuando el usuario toca una notificación
        PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
          console.log('[Push] Accion:', event.notification.data)
        })

      } catch (err) {
        // Fallback silencioso: probablemente no es un dispositivo nativo
        console.debug('[Push] No disponible en este entorno:', err.message)
      }
    }

    setup()

    return () => {
      cancelled = true
    }
  }, [token, addNotification])
}
