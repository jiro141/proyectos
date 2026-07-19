import { create } from 'zustand'
import api from '../../../services/api'
import toast from 'react-hot-toast'

export const useMenuStore = create((set) => ({
  categories: [],
  items: [],
  loading: false,

  fetchMenu: async () => {
    set({ loading: true })
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get('/menu/categories/'),
        api.get('/menu/items/'),
      ])
      set({ categories: catRes.data.results || catRes.data, items: itemRes.data.results || itemRes.data })
    } catch {
      toast.error('Error al cargar el menú')
    } finally {
      set({ loading: false })
    }
  },

  createCategory: async (data) => {
    const res = await api.post('/menu/categories/', data)
    set((s) => ({ categories: [...s.categories, res.data] }))
    toast.success('Categoría creada')
    return res.data
  },

  deleteCategory: async (id) => {
    await api.delete(`/menu/categories/${id}/`)
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }))
    toast.success('Categoría eliminada')
  },

  createItem: async (data) => {
    const res = await api.post('/menu/items/', data)
    set((s) => ({ items: [...s.items, res.data] }))
    toast.success('Producto creado')
    return res.data
  },

  updateItem: async (id, data) => {
    const res = await api.patch(`/menu/items/${id}/`, data)
    set((s) => ({ items: s.items.map((i) => (i.id === id ? res.data : i)) }))
    toast.success('Producto actualizado')
    return res.data
  },

  deleteItem: async (id) => {
    await api.delete(`/menu/items/${id}/`)
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }))
    toast.success('Producto eliminado')
  },
}))
