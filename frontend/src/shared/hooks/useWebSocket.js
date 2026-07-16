import { useEffect, useRef } from 'react'
import { useAuthStore } from '../../features/auth/store/useAuthStore'

export default function useWebSocket(endpoint = '/ws/notifications/', onMessage) {
  const ws = useRef(null)
  const reconnectTimer = useRef(null)
  const { token } = useAuthStore()
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!token) return

    function getWsUrl() {
      const serverUrl = localStorage.getItem('server_url')
      if (serverUrl) {
        // Remoto: convertir http://... a ws://...
        const wsProtocol = serverUrl.startsWith('https') ? 'wss' : 'ws'
        return serverUrl.replace(/^https?:\/\//, `${wsProtocol}://`).replace(/\/+$/, '')
      }
      // Local: usar el mismo host que sirve la página
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      return `${protocol}//${window.location.host}`
    }

    let cancelled = false

    function connect() {
      if (cancelled) return
      const wsUrl = getWsUrl()
      ws.current = new WebSocket(`${wsUrl}${endpoint}?token=${token}`)

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessageRef.current?.(data)
        } catch {
          // ignore malformed messages
        }
      }

      ws.current.onclose = () => {
        if (cancelled) return
        reconnectTimer.current = setTimeout(() => {
          if (!cancelled) connect()
        }, 3000)
      }
    }

    connect()

    return () => {
      cancelled = true
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
      ws.current?.close()
      ws.current = null
    }
  }, [endpoint, token])

  return ws
}
