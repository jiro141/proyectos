import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../features/auth/store/useAuthStore'
import { useNavigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { FiGrid, FiCoffee, FiClipboard, FiDroplet, FiDollarSign, FiLogOut, FiMenu, FiX, FiLoader, FiBell, FiCheck } from 'react-icons/fi'
import { useNotificationStore } from '../features/notifications/store/useNotificationStore'
import useFirebaseMessaging from '../shared/hooks/useFirebaseMessaging'

const navItems = [
  { path: '/mesas', label: 'Mesas', roles: ['waiter', 'admin'], icon: FiGrid },
  { path: '/pedidos', label: 'Pedidos', roles: ['waiter'], icon: FiClipboard },
  { path: '/cocina', label: 'Cocina', roles: ['kitchen'], icon: FiCoffee },
  { path: '/caja', label: 'Caja', roles: ['cashier'], icon: FiDollarSign },
  { path: '/menu', label: 'Menu', roles: ['admin'], icon: FiDroplet },
]

export default function DashboardLayout() {
  const { user, logout, isAuthenticated, fetchUser, restoring } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef(null)
  useFirebaseMessaging()

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!showNotifications) return
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showNotifications])

  const { notifications, unreadCount, markAllRead, clearNotifications } = useNotificationStore()

  // Redirect si no está autenticado
  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated])

  // Safety net: si está autenticado pero no tenemos datos del usuario, restaurarlos
  useEffect(() => {
    if (isAuthenticated && !user && !restoring) {
      fetchUser()
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Mientras restauramos sesión, mostrar loading full-screen
  if (isAuthenticated && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <FiLoader className="animate-spin mx-auto text-primary-400" size={40} />
          <p className="mt-4 text-gray-400 text-sm">Restaurando sesión...</p>
        </div>
      </div>
    )
  }

  const isAdmin = user?.role === 'admin' || user?.is_superuser
  const filteredNav = isAdmin ? navItems : navItems.filter((item) => item.roles.includes(user?.role))

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-center px-4 py-6 relative">
        <img src="/logo.png" alt="El Patio" className="h-24 w-auto" />
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1 rounded-lg hover:bg-gray-700 text-gray-400 absolute right-4"
        >
          <FiX size={24} />
        </button>
      </div>

      <nav className="space-y-1 flex-1 px-3">
        {filteredNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-primary-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <item.icon size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Notificaciones */}
      <div className="px-3 mb-2">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors relative"
        >
          <FiBell size={20} />
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <span className="ml-auto bg-primary-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      <div className="px-4 py-4 border-t border-gray-700">
        <p className="text-sm font-medium text-gray-300 truncate">{user?.username}</p>
        <p className="text-xs text-gray-500 capitalize mb-3">{user?.role}</p>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          <FiLogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex bg-gray-900">
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-gray-900 text-white shrink-0">
        {sidebarContent}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] h-full bg-gray-900 text-white shadow-xl animate-slide-in-left">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between bg-gray-900 border-b border-gray-800 px-4 py-3 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors"
            aria-label="Abrir menú"
          >
            <FiMenu size={24} />
          </button>
          <h1 className="text-lg font-bold text-primary-400">El Patio</h1>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors"
            aria-label="Notificaciones"
          >
            <FiBell size={22} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        </header>

        {/* Dropdown de notificaciones */}
        {showNotifications && (
          <div
            ref={notifRef}
            className="fixed right-4 top-16 z-50 w-80 sm:w-96 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-gray-200">Notificaciones</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary-500 hover:text-primary-400 transition-colors flex items-center gap-1"
                  >
                    <FiCheck size={14} />
                    Marcar leídas
                  </button>
                )}
                <button
                  onClick={clearNotifications}
                  className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <FiBell size={24} className="mx-auto mb-2 opacity-50" />
                  No hay notificaciones
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="px-4 py-3 hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 text-xs font-semibold uppercase px-1.5 py-0.5 rounded ${
                          notif.variant === 'success' ? 'bg-emerald-900/40 text-emerald-400' :
                          notif.variant === 'warning' ? 'bg-amber-900/40 text-amber-400' :
                          'bg-blue-900/40 text-blue-400'
                        }`}>
                          {notif.title}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1 ml-1">{notif.message}</p>
                      <span className="text-xs text-gray-500 mt-1 ml-1">{notif.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
