import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import api from '../../../services/api'
import toast from 'react-hot-toast'

const SERVER_URL = import.meta.env.VITE_API_URL || ''

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al iniciar sesión')
    }
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-6 sm:p-8 md:p-10 rounded-lg shadow-md border border-gray-700">
        <div className="flex justify-center mb-2">
          <img src="/logo.png" alt="Pizzería El Patio" className="h-16 sm:h-20 w-auto" />
        </div>
        <p className="text-xs sm:text-sm text-center text-gray-400 mb-6 sm:mb-8">
          {SERVER_URL || 'Conectando...'}
        </p>

        <div className="mb-4 sm:mb-5">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Ingresá tu usuario"
            autoFocus
            required
          />
        </div>
        <div className="mb-6 sm:mb-7">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Ingresá tu contraseña"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium transition-colors"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
