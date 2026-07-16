import { useCallback, useRef } from 'react'
import useWebSocket from './useWebSocket'
import { useNotificationStore } from '../../features/notifications/store/useNotificationStore'
import { useOrderStore } from '../../features/orders/store/useOrderStore'

export default function useNotificationSocket() {
  const addNotification = useNotificationStore(s => s.addNotification)
  const fetchOrders = useOrderStore(s => s.fetchOrders)
  // Evitar duplicados: guardamos IDs de eventos recientes
  const recentEvents = useRef(new Set())

  const handleMessage = useCallback((data) => {
    const type = data.type
    if (!type) return

    // Generar un ID único para este evento
    const eventId = data.order_id
      ? `${type}-${data.order_id}-${data.item_id || 'order'}`
      : `${type}-${Date.now()}`

    // Saltar si ya procesamos este evento en los últimos 2 segundos
    if (recentEvents.current.has(eventId)) return
    recentEvents.current.add(eventId)
    setTimeout(() => recentEvents.current.delete(eventId), 2000)

    const now = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

    // Mapear tipos de evento a notificaciones legibles
    const notification = (() => {
      switch (type) {
        case 'order.created':
          return {
            title: 'Nuevo pedido',
            message: `Mesa ${data.table_number} — ${data.waiter_name || 'Mozo'}`,
            variant: 'info',
          }
        case 'order.ready':
          return {
            title: 'Pedido listo',
            message: `Mesa ${data.table_number} — listo para entregar`,
            variant: 'success',
          }
        case 'order.delivered':
          return {
            title: 'Pedido entregado',
            message: `Mesa ${data.table_number} — entregado`,
            variant: 'default',
          }
        case 'item.preparing':
          return {
            title: 'En preparación',
            message: `${data.item_name} x${data.quantity} — Pedido #${data.order_id}`,
            variant: 'info',
          }
        case 'item.ready':
          return {
            title: 'Item listo',
            message: `${data.item_name} x${data.quantity} — Pedido #${data.order_id}`,
            variant: 'success',
          }
        case 'bill.created':
          return {
            title: 'Cuenta generada',
            message: `Mesa ${data.table_number} — total $${parseFloat(data.total || 0).toFixed(2)}`,
            variant: 'warning',
          }
        default:
          return null
      }
    })()

    if (notification) {
      addNotification({
        id: eventId,
        ...notification,
        time: now,
        timestamp: new Date().toISOString(),
        data,
      })
    }

    // Refrescar órdenes cuando algo cambia
    if (['order.created', 'order.updated', 'order.ready', 'order.delivered', 'item.preparing', 'item.ready'].includes(type)) {
      fetchOrders()
    }
  }, [addNotification, fetchOrders])

  useWebSocket('/ws/orders/', handleMessage)
}
