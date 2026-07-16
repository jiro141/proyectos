import { useCallback } from 'react'
import useWebSocket from './useWebSocket'
import { useOrderStore } from '../../features/orders/store/useOrderStore'

export default function useOrderSocket() {
  const fetchOrders = useOrderStore(s => s.fetchOrders)

  const handleMessage = useCallback((data) => {
    if (data.type === 'order.created' || data.type === 'order.updated') {
      fetchOrders()
    }
  }, [fetchOrders])

  useWebSocket('/ws/orders/', handleMessage)
}
