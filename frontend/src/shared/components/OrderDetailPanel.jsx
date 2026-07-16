import { useMemo } from 'react'
import { useOrderStore } from '../../features/orders/store/useOrderStore'
import Drawer from './Drawer'
import StatusBadge from './StatusBadge'
import { FiClock, FiUser, FiMapPin } from 'react-icons/fi'
import { formatCurrency } from '../utils/formatters'

function TimeSince({ date }) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)

  if (mins < 1) return 'menos de 1 min'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

const statusLabels = {
  pending: 'Pendiente',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export default function OrderDetailPanel({ actions }) {
  const { orders, selectedOrderId, setSelectedOrderId } = useOrderStore()

  const order = useMemo(
    () => orders.find((o) => o.id === selectedOrderId),
    [orders, selectedOrderId]
  )

  if (!order) return null

  return (
    <Drawer
      isOpen={!!selectedOrderId}
      onClose={() => setSelectedOrderId(null)}
      title={`Pedido #${order.id} — Mesa ${order.table?.number || order.table}`}
      footer={actions}
      dark
    >
      {/* Info */}
      <div className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-gray-300">
          <div className="flex items-center gap-1">
            <FiMapPin size={14} className="text-primary-400" />
            <span>Mesa {order.table?.number || order.table}</span>
          </div>
          <div className="flex items-center gap-1">
            <FiUser size={14} className="text-primary-400" />
            <span>{order.waiter?.username || 'Mesero'}</span>
          </div>
          <div className="flex items-center gap-1">
            <FiClock size={14} className="text-primary-400" />
            <span><TimeSince date={order.created_at} /></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <span className="text-xs text-gray-500">Estado del pedido</span>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-400 mb-1">Nota del pedido</p>
            <p className="text-sm text-gray-200">{order.notes}</p>
          </div>
        )}

        {/* Items */}
        <div>
          <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Items ({order.items?.length || 0})
          </h4>
          <div className="space-y-2">
            {order.items?.map((item) => (
              <div
                key={item.id}
                className="bg-gray-800 rounded-lg p-3 border border-gray-700"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-gray-100 shrink-0">
                      {item.quantity}x
                    </span>
                    <span className="font-medium text-gray-100 truncate">
                      {item.item_name || item.menu_item?.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-300 shrink-0 ml-2">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge status={item.status} />
                  <span className="text-xs text-gray-500">
                    {statusLabels[item.status] || item.status}
                  </span>
                </div>
                {item.notes && (
                  <p className="text-xs text-gray-400 italic mt-1">Nota: {item.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="border-t border-gray-700 pt-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-300">Total</span>
            <span className="text-xl font-bold text-primary-400">
              {formatCurrency(
                order.items?.reduce(
                  (sum, item) => sum + item.unit_price * item.quantity,
                  0
                ) || 0
              )}
            </span>
          </div>
        </div>
      </div>
    </Drawer>
  )
}
