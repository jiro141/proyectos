import { create } from 'zustand'
import api from '../../../services/api'
import toast from 'react-hot-toast'

export const useOrderStore = create((set, get) => ({
  orders: [],
  loading: false,
  selectedOrderId: null,

  setSelectedOrderId: (id) => set({ selectedOrderId: id }),

  fetchOrders: async (params = {}) => {
    set({ loading: true })
    try {
      const { data } = await api.get('/orders/', { params })
      set({ orders: data.results || data })
    } catch {
      toast.error('Error al cargar pedidos')
    } finally {
      set({ loading: false })
    }
  },

  createOrder: async (orderData) => {
    const { data } = await api.post('/orders/', orderData)
    set((s) => ({ orders: [data, ...s.orders] }))
    toast.success('Pedido creado')
    return data
  },

  addItem: async (orderId, itemData) => {
    const { data } = await api.post(`/orders/${orderId}/add_item/`, itemData)
    set((s) => ({
      orders: s.orders.map((o) =>
        o.id === orderId ? { ...o, items: [...(o.items || []), data] } : o
      ),
    }))
    return data
  },

  removeItem: async (orderId, itemId) => {
    try {
      await api.delete(`/orders/items/${itemId}/`)
      set((s) => ({
        orders: s.orders.map((o) =>
          o.id === orderId
            ? { ...o, items: o.items?.filter((i) => i.id !== itemId) }
            : o
        ),
      }))
      toast.success('Producto eliminado del pedido')
    } catch {
      toast.error('Error al eliminar el producto')
    }
  },

  updateItemStatus: async (itemId, status) => {
    try {
      const { data } = await api.patch(`/orders/items/${itemId}/update_status/`, { status })
      set((s) => ({
        orders: s.orders.map((order) => {
          const newItems = order.items?.map((item) =>
            item.id === itemId ? { ...item, ...data } : item
          )
          const allDelivered = newItems?.every((i) => i.status === 'delivered')
          return {
            ...order,
            items: newItems,
            status: allDelivered ? 'delivered' : order.status,
          }
        }),
      }))
      toast.success(`Producto marcado como ${status}`)
      return data
    } catch {
      toast.error(`Error al marcar producto como ${status}`)
    }
  },

  updateOrderStatus: async (orderId, status) => {
    const { data } = await api.patch(`/orders/${orderId}/update_status/`, { status })
    set((s) => ({
      orders: s.orders.map((o) => (o.id === orderId ? data : o)),
    }))
    toast.success(`Pedido #${orderId} marcado como ${status}`)
    return data
  },

  clearDeliveredOrders: () => set((s) => ({
    orders: s.orders.filter((o) => o.status !== 'delivered' && o.status !== 'billed'),
    selectedOrderId: null,
  })),
}))
