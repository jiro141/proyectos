import { useEffect, useState, useMemo } from 'react'
import { useOrderStore } from '../../orders/store/useOrderStore'
import { useBillStore } from '../store/useBillStore'
import { useTableStore } from '../../tables/store/useTableStore'
import Drawer from '../../../shared/components/Drawer'
import Button from '../../../shared/components/Button'
import StatusBadge from '../../../shared/components/StatusBadge'
import { formatCurrency, formatDate } from '../../../shared/utils/formatters'
import generateBillPdf from '../../../shared/utils/generateBillPdf'
import generateReportPdf from '../../../shared/utils/generateReportPdf'
import {
  FiDollarSign, FiCheckCircle, FiPrinter, FiRefreshCw,
  FiClipboard, FiClock, FiUser, FiChevronRight,
  FiCreditCard, FiSend, FiX, FiTrendingUp, FiFileText, FiPower,
} from 'react-icons/fi'
import toast from 'react-hot-toast'

/* ─── Resumen de estadísticas ─── */
function StatsCards({ dashboard, toBillCount, pendingCount }) {
  const stats = [
    {
      label: 'Total Facturado',
      value: formatCurrency(dashboard.total_billed),
      icon: FiTrendingUp,
      bg: 'bg-blue-900/40',
      border: 'border-blue-700',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Total Pagado',
      value: formatCurrency(dashboard.total_paid),
      icon: FiCheckCircle,
      bg: 'bg-emerald-900/40',
      border: 'border-emerald-700',
      iconColor: 'text-emerald-400',
    },
    {
      label: 'Por Cobrar',
      value: formatCurrency(dashboard.total_pending),
      extra: `${pendingCount} cuentas`,
      icon: FiDollarSign,
      bg: 'bg-amber-900/40',
      border: 'border-amber-700',
      iconColor: 'text-amber-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((s) => (
        <div key={s.label} className={`bg-gray-800 rounded-xl border ${s.border} shadow-sm p-4 flex items-center gap-4`}>
          <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
            <s.icon size={20} className={s.iconColor} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
            {s.extra && <p className="text-xs text-gray-500 mt-0.5">{s.extra}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Card de pedido entregado ─── */
function DeliveredOrderCard({ order, tableNumber, onClick }) {
  const total = order.items?.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0) || 0
  const itemCount = order.items?.length || 0

  return (
    <div
      onClick={() => onClick(order)}
      className="group bg-gray-800 rounded-xl border border-gray-700 shadow-sm hover:shadow-md
        hover:border-amber-600 transition-all duration-200 cursor-pointer overflow-hidden"
    >
      <div className="h-1 bg-amber-400" />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-lg font-bold">Mesa {tableNumber}</p>
            {order.waiter?.username && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <FiUser size={11} />
                {order.waiter.username}
              </p>
            )}
          </div>
          <StatusBadge status="delivered" />
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          <span className="flex items-center gap-1">
            <FiClipboard size={11} />
            {itemCount} items
          </span>
          <span className="flex items-center gap-1">
            <FiClock size={11} />
            {formatDate(order.created_at)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
          <span className="text-sm font-semibold">{formatCurrency(total)}</span>
          <span className="text-xs text-amber-400 font-medium flex items-center gap-1
            opacity-0 group-hover:opacity-100 transition-opacity">
            Facturar <FiChevronRight size={14} />
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Card de cuenta pendiente ─── */
function PendingBillCard({ bill, onClick }) {
  return (
    <div
      onClick={() => onClick(bill)}
      className="group bg-gray-800 rounded-xl border border-gray-700 shadow-sm hover:shadow-md
        hover:border-purple-600 transition-all duration-200 cursor-pointer overflow-hidden"
    >
      <div className="h-1 bg-purple-500" />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-lg font-bold">Mesa {bill.table_number || bill.order?.table?.number || bill.table}</p>
            {bill.waiter_name && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <FiUser size={11} />
                {bill.waiter_name}
              </p>
            )}
          </div>
          <StatusBadge status="pending" />
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          <span className="flex items-center gap-1">
            <FiClipboard size={11} />
            Cuenta #{bill.id}
          </span>
          <span className="flex items-center gap-1">
            <FiClock size={11} />
            {formatDate(bill.created_at)}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
          <span className="text-lg font-bold text-primary-400">{formatCurrency(bill.total)}</span>
          <span className="text-xs text-purple-400 font-medium flex items-center gap-1
            opacity-0 group-hover:opacity-100 transition-opacity">
            Cobrar <FiChevronRight size={14} />
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── Drawer de Facturación ─── */
function BillDrawer({ order, onClose, onGenerate }) {
  if (!order) return null

  const total = order.items?.reduce((s, i) => s + Number(i.unit_price) * Number(i.quantity), 0) || 0
  const tax = total * 0.1
  const grandTotal = total + tax
  const tableNum = order.table?.number || order.table

  return (
    <Drawer
      isOpen={!!order}
      onClose={onClose}
      title={`Facturar — Mesa ${tableNum}`}
      dark
    >
      <div className="space-y-5">
        {/* Encabezado */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Pedido #{order.id}</span>
          {order.waiter?.username && (
            <span className="text-gray-400 flex items-center gap-1">
              <FiUser size={12} />
              {order.waiter.username}
            </span>
          )}
        </div>

        {/* Items del pedido */}
        <div className="border border-gray-700 rounded-xl divide-y divide-gray-700">
          <div className="px-4 py-2 bg-gray-700 rounded-t-xl flex justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span>Item</span>
            <span>Subtotal</span>
          </div>
          {order.items?.map((item) => (
            <div key={item.id} className="px-4 py-3 flex justify-between items-center">
              <div className="min-w-0 mr-2">
                <p className="text-sm font-medium truncate">
                  {item.item_name || item.menu_item?.name}
                </p>
                <p className="text-xs text-gray-400">
                  x{item.quantity} · {formatCurrency(Number(item.unit_price))} c/u
                </p>
              </div>
              <span className="text-sm font-semibold shrink-0">
                {formatCurrency(Number(item.unit_price) * Number(item.quantity))}
              </span>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="space-y-1.5 text-sm bg-gray-700 rounded-xl p-4">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>IVA (10%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-600">
            <span className="font-semibold text-base">Total</span>
            <span className="font-bold text-primary-400 text-lg">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        <Button
          onClick={() => onGenerate(order)}
          className="w-full flex items-center justify-center gap-2"
        >
          <FiPrinter size={16} />
          Generar Cuenta
        </Button>
      </div>
    </Drawer>
  )
}

/* ─── Drawer de Cobro ─── */
function PaymentDrawer({ bill, onClose, onPay }) {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountPaid, setAmountPaid] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    if (bill) {
      setPaymentMethod('cash')
      setAmountPaid('')
      setPaying(false)
    }
  }, [bill])

  if (!bill) return null

  const total = Number(bill.total)
  const paid = Number(amountPaid || 0)
  const change = paymentMethod === 'cash' ? paid - total : 0

  const handlePay = async () => {
    setPaying(true)
    try {
      await onPay(bill, paymentMethod, amountPaid)
    } finally {
      setPaying(false)
    }
  }

  const tableNum = bill.table_number || bill.order?.table?.number || bill.table
  const canPay = paymentMethod === 'cash' ? paid >= total && paid > 0 : true

  return (
    <Drawer
      isOpen={!!bill}
      onClose={onClose}
      title={`Cobrar — Mesa ${tableNum}`}
      dark
    >
      <div className="space-y-5">
        {/* Items de la cuenta */}
        <div className="border border-gray-700 rounded-xl divide-y divide-gray-700">
          <div className="px-4 py-2 bg-gray-700 rounded-t-xl flex justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span>Item</span>
            <span>Subtotal</span>
          </div>
          {(bill.items || bill.order?.items || []).map((item, i) => (
            <div key={item.id || i} className="px-4 py-3 flex justify-between items-center">
              <div className="min-w-0 mr-2">
                <p className="text-sm font-medium truncate">
                  {item.name || item.item_name || item.menu_item?.name}
                </p>
                <p className="text-xs text-gray-400">
                  x{item.quantity} · {formatCurrency(Number(item.price || item.unit_price))} c/u
                </p>
              </div>
              <span className="text-sm font-semibold shrink-0">
                {formatCurrency(Number(item.price || item.unit_price) * Number(item.quantity))}
              </span>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="space-y-1.5 text-sm bg-gray-700 rounded-xl p-4">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal</span>
            <span>{formatCurrency(bill.subtotal || total)}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>IVA</span>
            <span>{formatCurrency(bill.tax || 0)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-600">
            <span className="font-semibold text-base">Total</span>
            <span className="font-bold text-primary-400 text-lg">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Método de pago */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-2">
            Método de pago
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'cash', label: 'Efectivo', icon: FiDollarSign },
              { value: 'card', label: 'Tarjeta', icon: FiCreditCard },
              { value: 'transfer', label: 'Transferencia', icon: FiSend },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setPaymentMethod(value)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-sm font-medium
                  ${paymentMethod === value
                    ? 'border-primary-500 bg-primary-900/40 text-primary-300'
                    : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-600'
                  }`}
              >
                <Icon size={20} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Monto recibido (solo efectivo) */}
        {paymentMethod === 'cash' && (
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1">
              Monto recibido
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  text-lg font-bold text-white transition-shadow placeholder-gray-400"
                placeholder="0.00"
                min="0"
                step="0.01"
                autoFocus
              />
            </div>
            {paid > 0 && (
              <div className="mt-2 flex items-center justify-between text-sm bg-gray-700 rounded-lg p-3">
                {change >= 0 ? (
                  <>
                    <span className="text-gray-400">Vuelto</span>
                    <span className="font-bold text-emerald-400 text-base">{formatCurrency(change)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-400">Faltan</span>
                    <span className="font-bold text-rose-400 text-base">{formatCurrency(Math.abs(change))}</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <Button
          onClick={handlePay}
          disabled={paying || !canPay}
          className="w-full flex items-center justify-center gap-2"
        >
          <FiCheckCircle size={16} />
          {paying ? 'Procesando...' : `Cobrar ${formatCurrency(total)}`}
        </Button>
      </div>
    </Drawer>
  )
}

/* ─── Página principal ─── */
export default function CashierPage() {
  const { orders, fetchOrders, clearDeliveredOrders } = useOrderStore()
  const { bills, fetchBills, generateBill, payBill, dashboard, fetchDashboard, dashboardLoading, fetchReport, reportLoading, clearBills } = useBillStore()
  const { tables, fetchTables } = useTableStore()

  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedBill, setSelectedBill] = useState(null)
  const [showDayClose, setShowDayClose] = useState(false)

  useEffect(() => {
    fetchOrders({ status: 'delivered' })
    fetchBills({ status: 'pending' })
    fetchDashboard()
    fetchTables()
  }, [])

  const deliveredOrders = useMemo(() =>
    orders.filter(o => o.status === 'delivered'), [orders]
  )

  const pendingBills = useMemo(() =>
    bills.filter(b => b.status === 'pending' || !b.status), [bills]
  )

  const getTableNumber = (tableId) => {
    const table = tables.find(t => t.id === tableId)
    return table?.number || tableId
  }

  const handleGenerateBill = async (order) => {
    if (!order?.id) return
    let billId
    try {
      const bill = await generateBill(order.id)
      billId = bill?.id
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al generar la cuenta')
      return
    }

    // Generar PDF (separado para no ocultar errores de la API)
    try {
      await generateBillPdf(order, billId, window.location.origin)
    } catch (err) {
      console.error('Error generando PDF:', err)
      toast.error('La cuenta se generó pero hubo un error al generar el PDF')
    }

    setSelectedOrder(null)
    fetchOrders({ status: 'delivered' })
    fetchBills({ status: 'pending' })
    toast.success('Cuenta generada correctamente')
  }

  const handlePay = async (bill, paymentMethod, amountPaid) => {
    try {
      const paymentData = {
        payment_method: paymentMethod,
        cash_amount: paymentMethod === 'cash' ? Number(amountPaid) : bill.total,
      }
      await payBill(bill.id, paymentData)
      setSelectedBill(null)
      fetchDashboard()
      fetchBills({ status: 'pending' })
      fetchOrders({ status: 'delivered' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al procesar el pago')
    }
  }

  const handleGenerateReport = async () => {
    const data = await fetchReport()
    if (!data) return
    try {
      await generateReportPdf(data, window.location.origin)
      toast.success('Reporte de ventas descargado')
      setShowDayClose(true)
    } catch (err) {
      console.error('Error generando PDF de reporte:', err)
      toast.error('Error al generar el PDF del reporte')
    }
  }

  const handleDayClose = () => {
    clearDeliveredOrders()
    clearBills()
    setShowDayClose(false)
    toast.success('Cierre del día realizado. Pedidos entregados y cuentas limpiados.')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Caja</h1>
          <p className="text-sm text-gray-400 mt-0.5">Facturá pedidos entregados y cobrá cuentas pendientes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleGenerateReport}
            disabled={reportLoading}
          >
            <FiFileText size={16} className="inline mr-1.5" />
            {reportLoading ? 'Generando...' : 'Generar Reporte'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              fetchOrders({ status: 'delivered' })
              fetchBills({ status: 'pending' })
              fetchDashboard()
            }}
          >
            <FiRefreshCw size={16} className="inline mr-1.5" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <StatsCards
        dashboard={dashboard}
        toBillCount={deliveredOrders.length}
        pendingCount={pendingBills.length}
      />

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pedidos para Facturar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FiClipboard size={18} className="text-amber-400" />
              Pedidos para Facturar
            </h2>
            <span className="text-sm text-gray-400 font-medium">{deliveredOrders.length}</span>
          </div>
          <div className="space-y-3">
            {deliveredOrders.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
                <FiClipboard size={36} className="mx-auto mb-2 text-gray-600" />
                <p className="text-sm text-gray-400">No hay pedidos entregados pendientes</p>
              </div>
            ) : (
              deliveredOrders.map(order => (
                <DeliveredOrderCard
                  key={order.id}
                  order={order}
                  tableNumber={getTableNumber(order.table)}
                  onClick={setSelectedOrder}
                />
              ))
            )}
          </div>
        </div>

        {/* Cuentas Pendientes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FiCreditCard size={18} className="text-purple-400" />
              Cuentas Pendientes
            </h2>
            <span className="text-sm text-gray-400 font-medium">{pendingBills.length}</span>
          </div>
          <div className="space-y-3">
            {pendingBills.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
                <FiCreditCard size={36} className="mx-auto mb-2 text-gray-600" />
                <p className="text-sm text-gray-400">No hay cuentas pendientes de cobro</p>
              </div>
            ) : (
              pendingBills.map(bill => (
                <PendingBillCard
                  key={bill.id}
                  bill={bill}
                  onClick={setSelectedBill}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Últimos Cobros */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FiCheckCircle size={18} className="text-emerald-400" />
            Últimos Cobros
          </h2>
          {dashboardLoading && <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />}
        </div>
        {dashboard.recent_payments?.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <FiDollarSign size={36} className="mx-auto mb-2 text-gray-600" />
            <p className="text-sm text-gray-400">No hay cobros registrados</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-700/50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-400">Cuenta</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-400">Mesa</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-400">Método</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-400">Total</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-400">Pagado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {dashboard.recent_payments?.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 font-medium">#{payment.id}</td>
                    <td className="px-4 py-3 text-gray-300">
                      Mesa {payment.table_number || payment.order?.table?.number || payment.table}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                        ${payment.payment_method === 'cash' ? 'bg-emerald-900/30 text-emerald-300' : ''}
                        ${payment.payment_method === 'card' ? 'bg-blue-900/30 text-blue-300' : ''}
                        ${payment.payment_method === 'transfer' ? 'bg-purple-900/30 text-purple-300' : ''}
                      `}>
                        {payment.payment_method === 'cash' && <FiDollarSign size={12} />}
                        {payment.payment_method === 'card' && <FiCreditCard size={12} />}
                        {payment.payment_method === 'transfer' && <FiSend size={12} />}
                        {payment.payment_method === 'cash' ? 'Efectivo' : payment.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(payment.total)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-emerald-400 font-semibold">{formatDate(payment.paid_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drawers laterales */}
      <BillDrawer
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onGenerate={handleGenerateBill}
      />

      <PaymentDrawer
        bill={selectedBill}
        onClose={() => setSelectedBill(null)}
        onPay={handlePay}
      />

      {/* ─── Modal de Cierre del Día ─── */}
      {showDayClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDayClose(false)} />
          <div className="relative rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" style={{ backgroundColor: '#111827' }}>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-amber-900/30 flex items-center justify-center">
                <FiPower size={28} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Cierre del Día</h3>
                <p className="text-sm text-gray-300 mt-1">
                  ¿Desea limpiar todos los pedidos del día? Los pedidos entregados, cuentas pendientes y estadísticas se eliminarán de la vista.
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="secondary"
                  onClick={() => setShowDayClose(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDayClose}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <FiCheckCircle size={16} />
                  Cierre del Día
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
