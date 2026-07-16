import { create } from 'zustand'
import api from '../../../services/api'
import toast from 'react-hot-toast'

export const useBillStore = create((set) => ({
  bills: [],
  loading: false,
  dashboard: {
    total_billed: 0,
    total_paid: 0,
    total_pending: 0,
    recent_payments: [],
  },
  dashboardLoading: false,

  fetchBills: async (params = {}) => {
    set({ loading: true })
    try {
      const { data } = await api.get('/bills/', { params })
      set({ bills: data.results || data })
    } catch {
      toast.error('Error al cargar cuentas')
    } finally {
      set({ loading: false })
    }
  },

  fetchDashboard: async () => {
    set({ dashboardLoading: true })
    try {
      const { data } = await api.get('/bills/dashboard/')
      set({ dashboard: data })
    } catch {
      toast.error('Error al cargar estadísticas')
    } finally {
      set({ dashboardLoading: false })
    }
  },

  generateBill: async (orderId) => {
    const { data } = await api.post('/bills/generate/', { order: orderId })
    set((s) => ({ bills: [...s.bills, data] }))
    toast.success('Cuenta generada')
    return data
  },

  payBill: async (id, paymentData) => {
    const { data } = await api.post(`/bills/${id}/pay/`, paymentData)
    set((s) => ({
      bills: s.bills.map((b) => (b.id === id ? data : b)),
    }))
    toast.success('Pago registrado')
    return data
  },
}))
