import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../../../services/api'
import { formatCurrency, formatDate } from '../../../shared/utils/formatters'
import generateBillPdf from '../../../shared/utils/generateBillPdf'
import { FiDownload, FiClock, FiUser, FiCheckCircle } from 'react-icons/fi'

export default function BillViewPage() {
  const { billId } = useParams()
  const [bill, setBill] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!billId) return
    setLoading(true)
    api.get(`/bills/${billId}/`)
      .then(({ data }) => {
        setBill(data)
        setError(null)
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Cuenta no encontrada')
      })
      .finally(() => setLoading(false))
  }, [billId])

  const handleDownloadPdf = async () => {
    if (!bill) return
    // Construimos un objeto order compatible con generateBillPdf
    const orderData = {
      id: bill.order,
      table: { number: bill.table_number },
      waiter: { username: bill.waiter_name },
      items: bill.items?.map((item) => ({
        id: item.id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        notes: item.notes,
      })) || [],
    }
    try {
      await generateBillPdf(orderData, bill.id, window.location.origin)
    } catch (err) {
      console.error('Error al generar PDF:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🧾</p>
          <h1 className="text-xl font-bold text-gray-300">Cuenta no encontrada</h1>
          <p className="text-sm text-gray-500 mt-2">{error || 'El enlace es inválido o la cuenta fue eliminada'}</p>
        </div>
      </div>
    )
  }

  const subtotal = bill.items?.reduce(
    (s, i) => s + Number(i.quantity) * Number(i.unit_price), 0
  ) || 0
  const tax = subtotal * 0.1
  const grandTotal = subtotal + tax

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* ── Botón flotante de descarga ── */}
      <button
        onClick={handleDownloadPdf}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-full shadow-lg transition-all hover:shadow-xl hover:scale-105"
      >
        <FiDownload size={18} />
        Descargar PDF
      </button>

      {/* ── Contenido de la cuenta ── */}
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary-500">Pizzería El Patio</h1>
          <p className="text-sm text-gray-500 mt-1">Comprobante no fiscal</p>
        </div>

        {/* Info */}
        <div className="bg-gray-800 rounded-xl p-4 mb-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Pedido</span>
            <span className="font-semibold">#{bill.order}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Mesa</span>
            <span className="font-semibold">{bill.table_number}</span>
          </div>
          {bill.waiter_name && (
            <div className="flex justify-between">
              <span className="text-gray-400 flex items-center gap-1"><FiUser size={12} /> Mozo</span>
              <span className="font-semibold">{bill.waiter_name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400 flex items-center gap-1"><FiClock size={12} /> Creada</span>
            <span className="font-semibold">{formatDate(bill.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Estado</span>
            <span className={`font-semibold flex items-center gap-1 ${
              bill.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              <FiCheckCircle size={12} />
              {bill.status === 'paid' ? 'Pagada' : 'Pendiente'}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="bg-gray-800 rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-2 bg-gray-700 flex justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span>Item</span>
            <span>Subtotal</span>
          </div>
          <div className="divide-y divide-gray-700">
            {bill.items?.map((item) => (
              <div key={item.id} className="px-4 py-3 flex justify-between items-center">
                <div className="min-w-0 mr-2">
                  <p className="text-sm font-medium truncate">{item.item_name}</p>
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
        </div>

        {/* Totales */}
        <div className="bg-gray-800 rounded-xl p-4 space-y-1.5 text-sm mb-8">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>IVA (10%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-700">
            <span className="font-semibold text-base">Total</span>
            <span className="font-bold text-primary-400 text-lg">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600">
          Pizzería El Patio · Gracias por su visita
        </p>
      </div>
    </div>
  )
}
