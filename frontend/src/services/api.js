import axios from 'axios'

function getServerUrl() {
  return localStorage.getItem('server_url') || import.meta.env.VITE_API_URL || ''
}

function getBaseUrl() {
  const server = getServerUrl()
  return server ? `${server}/api` : '/api'
}

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
})

// Actualizar baseURL antes de cada request (por si cambiaron la IP)
api.interceptors.request.use((config) => {
  config.baseURL = getBaseUrl()
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const server = getServerUrl()
          const refreshUrl = server ? `${server}/api/auth/refresh/` : '/api/auth/refresh/'
          const { data } = await axios.post(refreshUrl, { refresh })
          localStorage.setItem('access_token', data.access)
          originalRequest.headers.Authorization = `Bearer ${data.access}`
          return api(originalRequest)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

/** Devuelve la URL base del servidor (sin /api) para mostrar al usuario */
export function getServerUrlDisplay() {
  return getServerUrl() || 'localhost (mismo equipo)'
}

export default api
