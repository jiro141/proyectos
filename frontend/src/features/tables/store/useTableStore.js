import { create } from 'zustand'
import api from '../../../services/api'
import toast from 'react-hot-toast'

export const useTableStore = create((set) => ({
  tables: [],
  loading: false,

  fetchTables: async () => {
    set({ loading: true })
    try {
      const { data } = await api.get('/tables/')
      set({ tables: data.results || data })
    } catch {
      toast.error('Error al cargar mesas')
    } finally {
      set({ loading: false })
    }
  },

  occupyTable: async (id) => {
    const { data } = await api.post(`/tables/${id}/occupy/`)
    set((s) => ({ tables: s.tables.map((t) => (t.id === id ? data : t)) }))
    toast.success('Mesa ocupada')
    return data
  },

  freeTable: async (id) => {
    const { data } = await api.post(`/tables/${id}/free/`)
    set((s) => ({ tables: s.tables.map((t) => (t.id === id ? data : t)) }))
    toast.success('Mesa liberada')
    return data
  },

  cleanTable: async (id) => {
    const { data } = await api.post(`/tables/${id}/start_cleaning/`)
    set((s) => ({ tables: s.tables.map((t) => (t.id === id ? data : t)) }))
    toast.success('Mesa marcada en limpieza')
    return data
  },

  createTable: async (tableData) => {
    const { data } = await api.post('/tables/', tableData)
    set((s) => ({ tables: [...s.tables, data] }))
    toast.success('Mesa creada')
    return data
  },

  deleteTable: async (id) => {
    await api.delete(`/tables/${id}/`)
    set((s) => ({ tables: s.tables.filter((t) => t.id !== id) }))
    toast.success('Mesa eliminada')
  },
}))
