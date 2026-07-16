import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { getServerUrlDisplay } from '../../../services/api'
import api from '../../../services/api'
import toast from 'react-hot-toast'
import { FiServer, FiChevronDown, FiChevronUp, FiCheck, FiX } from 'react-icons/fi'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('server_url') || '')
  const [showConfig, setShowConfig] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // null | 'ok' | 'error'
  const { login, loading } = useAuthStore()
  const navigate = useNavigate()

  // Sincronizar el input con localStorage si cambia externamente
  useEffect(() => {
    const saved = localStorage.getItem('server_url') || ''
    setServerUrl(saved)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al iniciar sesión')
    }
  }

  const handleSaveServer = () => {
    const trimmed = serverUrl.trim().replace(/\/+$/, '') // sacar trailing slash
    if (trimmed) {
      localStorage.setItem('server_url', trimmed)
    } else {
      localStorage.removeItem('server_url')
    }
    setTestResult(null)
    toast.success(trimmed ? `Servidor configurado: ${trimmed}` : 'Usando servidor local')
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const saved = serverUrl.trim().replace(/\/+$/, '')
      // Usar fetch directamente para evitar los interceptors de axios
      // que pisarian la baseURL con lo que haya en localStorage
      const url = saved ? `${saved}/api/auth/me/` : '/api/auth/me/'
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (res.ok) {
        setTestResult('ok')
      } else {
        setTestResult('error')
      }
    } catch {
      setTestResult('error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="w-full max-w-sm sm:max-w-md">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-6 sm:p-8 md:p-10 rounded-lg shadow-md mb-3 border border-gray-700">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-1 text-primary-500">
          Pizzería El Patio
        </h1>
        <p className="text-xs sm:text-sm text-center text-gray-400 mb-6 sm:mb-8">
          {getServerUrlDisplay()}
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

      {/* Configuración de servidor */}
      <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-700">
        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className="w-full flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 text-sm sm:text-base text-gray-300 hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FiServer size={16} className="text-gray-500" />
            <span>Configuración de servidor</span>
          </div>
          {showConfig ? <FiChevronUp size={16} className="text-gray-400" /> : <FiChevronDown size={16} className="text-gray-400" />}
        </button>

        {showConfig && (
          <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-gray-700 pt-3 space-y-3">
            <p className="text-xs sm:text-sm text-gray-400">
              Ingresá la IP del servidor si el backend está en otra máquina de la red local.
              Ej: <code className="bg-gray-700 text-gray-200 px-1 rounded">http://192.168.1.100:8000</code>
            </p>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => { setServerUrl(e.target.value); setTestResult(null) }}
              placeholder="http://192.168.1.x:8000"
              className="w-full px-3 py-2.5 text-sm bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleSaveServer}
                className="w-full sm:flex-1 px-4 py-2.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full sm:flex-1 px-4 py-2.5 text-sm border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
              >
                {testing ? 'Probando...' : 'Probar conexión'}
              </button>
            </div>

            {testResult === 'ok' && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <FiCheck size={16} />
                <span>Conexión exitosa</span>
              </div>
            )}
            {testResult === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <FiX size={16} />
                <span className="break-words">No se pudo conectar. Verificá la IP y que el backend esté corriendo.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
