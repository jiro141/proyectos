import { useEffect, useState, useMemo } from 'react'
import { useAuthStore } from '../../auth/store/useAuthStore'
import { useTableStore } from '../store/useTableStore'
import { useOrderStore } from '../../orders/store/useOrderStore'
import OrderCreationDrawer from '../../orders/components/OrderCreationDrawer'
import {
  FiPlus, FiShoppingCart, FiTrash2, FiRefreshCw, FiUsers, FiMapPin,
  FiChevronRight, FiGrid, FiUser, FiCheckCircle,
} from 'react-icons/fi'
import Drawer from '../../../shared/components/Drawer'
import Button from '../../../shared/components/Button'

/* ─── Config de estados ─── */
const STATUS = {
  free: {
    label: 'Libre',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-900/30 text-emerald-400 border-emerald-700',
  },
  occupied: {
    label: 'Ocupada',
    bar: 'bg-rose-500',
    dot: 'bg-rose-500',
    badge: 'bg-rose-900/30 text-rose-400 border-rose-700',
  },
  reserved: {
    label: 'Reservada',
    bar: 'bg-amber-400',
    dot: 'bg-amber-400',
    badge: 'bg-amber-900/30 text-amber-400 border-amber-700',
  },
  cleaning: {
    label: 'Limpieza',
    bar: 'bg-sky-400',
    dot: 'bg-sky-400',
    badge: 'bg-sky-900/30 text-sky-400 border-sky-700',
  },
}

/* ─── Resumen de conteo ─── */
function SummaryBar({ tables }) {
  const counts = useMemo(() => {
    const c = { free: 0, occupied: 0, reserved: 0, cleaning: 0 }
    tables.forEach((t) => { if (c[t.status] !== undefined) c[t.status]++ })
    return c
  }, [tables])

  const items = [
    { key: 'free', label: 'Libres', color: 'bg-emerald-500' },
    { key: 'occupied', label: 'Ocupadas', color: 'bg-rose-500' },
    { key: 'reserved', label: 'Reservadas', color: 'bg-amber-400' },
    { key: 'cleaning', label: 'Limpieza', color: 'bg-sky-400' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-gray-800 rounded-xl shadow-md border border-gray-700">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-200 mr-2">
        <FiGrid size={16} className="text-primary-400" />
        <span>{tables.length} mesas</span>
      </div>
      <div className="w-px h-5 bg-gray-600" />
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-1.5 text-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
          <span className="text-gray-400">{item.label}</span>
          <span className="font-semibold text-gray-100">{counts[item.key]}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── Card individual de mesa ─── */
function TableCard({ table, isAdmin, canTakeOrders, onOrder }) {
  const cfg = STATUS[table.status] || STATUS.free

  return (
    <div
      className={`
        relative bg-gray-800 rounded-2xl border border-gray-700 shadow-md
        transition-all duration-200 ease-out overflow-hidden
        ${canTakeOrders ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1 hover:border-gray-600' : ''}
      `}
      onClick={() => canTakeOrders && onOrder(table)}
    >
      {/* Barra de estado superior */}
      <div className={`h-1.5 w-full ${cfg.bar} transition-colors`} />

      <div className="p-4 sm:p-5">
        {/* Círculo con número de mesa */}
        <div className="flex justify-center mb-3">
          <div className="
            w-16 h-16 sm:w-20 sm:h-20 rounded-full
            flex items-center justify-center
            border-2 border-gray-600 bg-gray-700 shadow-inner
          ">
            <span className="text-2xl sm:text-3xl font-extrabold text-gray-100">
              {table.number || table.id}
            </span>
          </div>
        </div>

        {/* Info: capacidad + ubicación */}
        <div className="space-y-1 text-center mb-3">
          <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
            <FiUsers size={14} className="text-gray-500" />
            <span>Cap. <strong className="text-gray-300">{table.capacity}</strong></span>
          </div>
          {table.location && (
            <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
              <FiMapPin size={12} />
              <span>{table.location}</span>
            </div>
          )}
        </div>

        {/* Badge de estado */}
        <div className="flex justify-center mb-3">
          <span className={`
            inline-flex items-center gap-1.5 px-3 py-1 rounded-full
            text-xs font-semibold border
            ${cfg.badge}
          `}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>

        {/* Info de ocupación */}
        {table.status === 'occupied' && table.waiter_name && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mb-2 bg-gray-700 rounded-lg py-1.5 px-3 mx-auto w-fit">
            <FiUser size={12} className="text-primary-400" />
            <span><strong>Mozo:</strong> {table.waiter_name}</span>
          </div>
        )}

        {/* Eliminar (solo admin, solo mesas libres) */}
        {isAdmin && table.status === 'free' && (
          <div className="flex justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation()
                useTableStore.getState().deleteTable(table.id)
              }}
              className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
              title="Eliminar mesa"
            >
              <FiTrash2 size={15} />
            </button>
          </div>
        )}

        {/* Botón CTA */}
        {canTakeOrders && (
          <div className="mt-3 space-y-2">
            {table.status === 'free' && (
              <div
                onClick={(e) => { e.stopPropagation(); onOrder(table) }}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                  bg-primary-600 text-white border border-primary-600
                  hover:bg-primary-700 hover:border-primary-700
                  font-semibold text-sm transition-all"
              >
                <FiPlus size={16} />
                Nuevo Pedido
                <FiChevronRight size={16} className="ml-auto opacity-50" />
              </div>
            )}
            {table.status === 'occupied' && (
              <>
                <div
                  onClick={(e) => { e.stopPropagation(); onOrder(table) }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                    bg-rose-600 text-white border border-rose-600
                    hover:bg-rose-700 hover:border-rose-700
                    font-semibold text-sm transition-all"
                >
                  <FiShoppingCart size={16} />
                  Tomar Pedido
                  <FiChevronRight size={16} className="ml-auto opacity-50" />
                </div>
                <div
                  onClick={(e) => { e.stopPropagation(); useTableStore.getState().cleanTable(table.id) }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                    bg-sky-600 text-white border border-sky-600
                    hover:bg-sky-700 hover:border-sky-700
                    font-semibold text-sm transition-all"
                >
                  <FiRefreshCw size={16} />
                  Limpiar
                </div>
              </>
            )}
            {table.status === 'cleaning' && (
              <div
                onClick={(e) => { e.stopPropagation(); useTableStore.getState().freeTable(table.id) }}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                  bg-emerald-600 text-white border border-emerald-600
                  hover:bg-emerald-700 hover:border-emerald-700
                  font-semibold text-sm transition-all"
              >
                <FiCheckCircle size={16} />
                Lista para usar
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Página principal ─── */
export default function TablesPage() {
  const { tables, loading, fetchTables } = useTableStore()
  const { fetchOrders } = useOrderStore()
  const { user } = useAuthStore()

  const [orderDrawerTable, setOrderDrawerTable] = useState(null)
  const [existingOrderForDrawer, setExistingOrderForDrawer] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState({ number: '', capacity: 2, location: '' })

  useEffect(() => { fetchTables() }, [])

  const isAdmin = user?.role === 'admin' || user?.is_superuser
  const canTakeOrders = user?.role === 'waiter' || isAdmin

  const handleTableClick = (table) => {
    if (!canTakeOrders) return
    setExistingOrderForDrawer(null)
    setOrderDrawerTable(null)

    if (table.status === 'occupied') {
      fetchOrders({ table: table.id }).then(() => {
        const order = useOrderStore.getState().orders.find(
          (o) => o.table === table.id || o.table?.id === table.id
        )
        if (order) setExistingOrderForDrawer(order)
        setOrderDrawerTable(table)
      })
    } else {
      setOrderDrawerTable(table)
    }
  }

  const handleCreateTable = async (e) => {
    e.preventDefault()
    await useTableStore.getState().createTable({
      number: parseInt(form.number),
      capacity: parseInt(form.capacity),
      location: form.location,
    })
    setShowCreateModal(false)
    setForm({ number: '', capacity: 2, location: '' })
  }

  if (loading && tables.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent mb-4" />
        <p className="text-sm">Cargando mesas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Mapa de Mesas</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestioná el estado y los pedidos de cada mesa</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)}>
              <FiPlus size={16} className="inline mr-1.5" />
              Agregar Mesa
            </Button>
          )}
          <Button variant="secondary" onClick={fetchTables}>
            <FiRefreshCw size={16} className="inline mr-1.5" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <SummaryBar tables={tables} />

      {/* Grid de mesas */}
      {tables.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <FiGrid size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-lg font-medium text-gray-400">No hay mesas registradas</p>
          {isAdmin && (
            <p className="text-sm mt-1 text-gray-500">
              Agregá la primera mesa usando el botón <strong className="text-gray-300">Agregar Mesa</strong>
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              isAdmin={isAdmin}
              canTakeOrders={canTakeOrders}
              onOrder={handleTableClick}
            />
          ))}
        </div>
      )}

      {/* Drawer de crear mesa */}
      <Drawer
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Agregar Mesa"
        dark
      >
        <form onSubmit={handleCreateTable} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-300">
              Número de mesa
            </label>
            <input
              type="number"
              value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-700 text-white border border-gray-600 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                transition-shadow placeholder-gray-400"
              placeholder="Ej: 1"
              required
              min="1"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-300">
              Capacidad (personas)
            </label>
            <input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-700 text-white border border-gray-600 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                transition-shadow placeholder-gray-400"
              required
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-300">
              Ubicación
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-700 text-white border border-gray-600 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                transition-shadow placeholder-gray-400"
              placeholder="Ej: Salón principal, Terraza"
            />
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <Button variant="secondary" type="button" onClick={() => setShowCreateModal(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">Crear Mesa</Button>
          </div>
        </form>
      </Drawer>

      {/* Drawer de pedidos */}
      <OrderCreationDrawer
        isOpen={!!orderDrawerTable}
        onClose={() => { setOrderDrawerTable(null); setExistingOrderForDrawer(null) }}
        table={orderDrawerTable}
        existingOrder={existingOrderForDrawer}
        onSuccess={() => {
          fetchTables()
          if (orderDrawerTable) fetchOrders({ table: orderDrawerTable.id })
        }}
        dark
      />
    </div>
  )
}
