import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../auth/store/useAuthStore'
import { FiGrid, FiClipboard, FiCoffee, FiDollarSign, FiDroplet } from 'react-icons/fi'

const modules = [
  { path: '/mesas', label: 'Mesas', roles: ['waiter', 'admin'], icon: FiGrid, desc: 'Gestión de mesas y comandas' },
  { path: '/pedidos', label: 'Pedidos', roles: ['waiter'], icon: FiClipboard, desc: 'Órdenes activas de meseros' },
  { path: '/cocina', label: 'Cocina', roles: ['kitchen'], icon: FiCoffee, desc: 'Órdenes pendientes de preparación' },
  { path: '/caja', label: 'Caja', roles: ['cashier'], icon: FiDollarSign, desc: 'Cobros y facturación' },
  { path: '/menu', label: 'Menú', roles: ['admin'], icon: FiDroplet, desc: 'Administración del menú' },
]

export default function WelcomePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin' || user?.is_superuser

  const userModules = modules.filter(
    (m) => isAdmin || m.roles.includes(user?.role)
  )

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="mb-8">
        <img src="/logo.png" alt="El Patio" className="h-20 w-auto mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white">
          ¡Bienvenido, {user?.username}!
        </h1>
        <p className="text-gray-400 mt-1 capitalize">
          {user?.role === 'admin' ? 'Administrador' : user?.role}
        </p>
      </div>

      <div className={
        userModules.length === 1
          ? "flex justify-center"
          : "grid grid-cols-1 sm:grid-cols-2 gap-4"
      }>
        {userModules.map((mod) => (
          <button
            key={mod.path}
            onClick={() => navigate(mod.path)}
            className="flex flex-col items-center gap-2 p-6 bg-gray-800 rounded-xl border border-gray-700 hover:border-primary-500 hover:bg-gray-750 transition-all text-center group"
          >
            <mod.icon size={32} className="text-primary-400 group-hover:scale-110 transition-transform" />
            <span className="text-lg font-semibold text-white">{mod.label}</span>
            <span className="text-sm text-gray-400">{mod.desc}</span>
          </button>
        ))}
      </div>

      {userModules.length === 1 && (
        <p className="text-gray-500 text-sm mt-6">
          Solo tenés acceso a este módulo. Hablá con el administrador si necesitás más permisos.
        </p>
      )}
    </div>
  )
}
