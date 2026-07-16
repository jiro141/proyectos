import { create } from 'zustand'
import api from '../../../services/api'

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  loading: false,
  restoring: false,

  /** Refresca los datos del usuario desde el servidor usando el token actual */
  fetchUser: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    set({ restoring: true })
    try {
      const { data: userData } = await api.get('/auth/me/')
      localStorage.setItem('user', JSON.stringify(userData))
      set({ user: userData, isAuthenticated: true, restoring: false })
    } catch {
      // Token inválido o expirado — forzar logout
      localStorage.clear()
      set({ user: null, token: null, isAuthenticated: false, restoring: false })
    }
  },

  login: async (username, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login/', { username, password })
      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)

      const { data: userData } = await api.get('/auth/me/')
      localStorage.setItem('user', JSON.stringify(userData))
      set({ user: userData, token: data.access, isAuthenticated: true })
    } catch (err) {
      // Si /auth/me/ falló, limpiar para no quedar en estado inconsistente
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      set({ user: null, token: null, isAuthenticated: false })
      throw err
    } finally {
      set({ loading: false })
    }
  },

  logout: () => {
    localStorage.clear()
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
