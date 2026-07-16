import { useEffect, useState, useMemo } from 'react'
import { useMenuStore } from '../../menu/store/useMenuStore'
import { useOrderStore } from '../store/useOrderStore'
import { useTableStore } from '../../tables/store/useTableStore'
import Drawer from '../../../shared/components/Drawer'
import Button from '../../../shared/components/Button'
import Modal from '../../../shared/components/Modal'
import ConfirmDialog from '../../../shared/components/ConfirmDialog'
import { formatCurrency } from '../../../shared/utils/formatters'
import { FiPlus, FiMinus, FiShoppingCart, FiSend, FiClock, FiSearch, FiX, FiCheckCircle, FiRefreshCw, FiTrash2 } from 'react-icons/fi'
import toast from 'react-hot-toast'

const ORDER_STATUS = {
  pending: { label: 'Pendiente', color: 'bg-amber-500', badge: 'bg-amber-900/30 text-amber-400' },
  preparing: { label: 'Preparando', color: 'bg-blue-500', badge: 'bg-blue-900/30 text-blue-400' },
  ready: { label: 'Listo', color: 'bg-green-500', badge: 'bg-green-900/30 text-green-400' },
  delivered: { label: 'Entregado', color: 'bg-gray-500', badge: 'bg-gray-700 text-gray-300' },
  billed: { label: 'Facturado', color: 'bg-purple-500', badge: 'bg-purple-900/30 text-purple-400' },
}

export default function OrderCreationDrawer({ isOpen, onClose, table, existingOrder, onSuccess, dark }) {
  const { categories, items, fetchMenu } = useMenuStore()
  const { createOrder, addItem, removeItem } = useOrderStore()

  // Suscripción al store para actualización en tiempo real del pedido
  const liveOrder = useOrderStore(
    (s) => s.orders.find((o) => o.id === existingOrder?.id)
  )
  const order = liveOrder || existingOrder

  const [cart, setCart] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [notesModal, setNotesModal] = useState(null)
  const [notesText, setNotesText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(null)

  const existingTotal = useMemo(() => {
    if (!order?.items) return 0
    return order.items.reduce(
      (sum, item) => sum + parseFloat(item.unit_price || 0) * item.quantity, 0
    )
  }, [order])

  const orderStatus = order ? ORDER_STATUS[order.status] || ORDER_STATUS.pending : null

  useEffect(() => {
    if (isOpen && table) {
      if (categories.length === 0) fetchMenu()
      setCart([])
    }
  }, [isOpen, table?.id])

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0].id)
    }
  }, [categories])

  const groupedItems = categories.map(cat => ({
    ...cat,
    items: items.filter(
      i => (i.category === cat.id || i.category?.id === cat.id) && i.available !== false
    ),
  }))

  const activeGroup = groupedItems.find(g => g.id === activeCategory)

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.trim().toLowerCase()
    return groupedItems
      .map(cat => ({
        ...cat,
        items: cat.items.filter(i => i.name.toLowerCase().includes(q)),
      }))
      .filter(cat => cat.items.length > 0)
  }, [searchQuery, groupedItems])

  const addToCart = (menuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menu_item.id === menuItem.id)
      if (existing) {
        return prev.map(i =>
          i.menu_item.id === menuItem.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, { menu_item: menuItem, quantity: 1, notes: '' }]
    })
    toast.success(`${menuItem.name} agregado`)
  }

  const updateQuantity = (itemId, delta) => {
    setCart(prev =>
      prev
        .map(i =>
          i.menu_item.id === itemId
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i
        )
        .filter(i => i.quantity > 0)
    )
  }

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.menu_item.price * item.quantity, 0
  )

  const handleSubmit = async () => {
    if (!table || cart.length === 0) return
    setSubmitting(true)
    try {
      if (existingOrder) {
        for (const item of cart) {
          await addItem(existingOrder.id, {
            menu_item: item.menu_item.id,
            quantity: item.quantity,
            notes: item.notes || '',
          })
        }
        toast.success('Items agregados al pedido')
      } else {
        await createOrder({
          table: table.id,
          items: cart.map(item => ({
            menu_item: item.menu_item.id,
            quantity: item.quantity,
            notes: item.notes || '',
          })),
        })
      }
      setCart([])
      onSuccess?.()
      onClose()
    } catch {
      toast.error('Error al guardar el pedido')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkAsReady = async () => {
    if (!table) return
    try {
      await useTableStore.getState().freeTable(table.id)
      toast.success('Mesa lista para usar')
      onSuccess?.()
      onClose()
    } catch {
      toast.error('Error al liberar la mesa')
    }
  }

  const handleConfirmDelete = async () => {
    if (!confirmDeleteItem) return
    await removeItem(confirmDeleteItem.orderId, confirmDeleteItem.itemId)
    setConfirmDeleteItem(null)
    onSuccess?.()
  }

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={`Mesa ${table?.number || table?.id}`}
        dark={dark}
      >
        {/* ── Mesa en limpieza ── */}
        {table?.status === 'cleaning' ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 rounded-full bg-sky-900/30 border-2 border-sky-500/30 flex items-center justify-center">
              <FiRefreshCw size={40} className="text-sky-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-100 mt-5">Mesa en Limpieza</h3>
            <p className="text-sm text-gray-400 mt-1.5 mb-8 text-center max-w-xs">
              La mesa está siendo higienizada. Hacé clic en "Lista para usar" cuando esté lista.
            </p>
            <Button
              variant="success"
              onClick={handleMarkAsReady}
              className="w-full flex items-center justify-center gap-2 py-3 text-base"
            >
              <FiCheckCircle size={20} />
              Lista para usar
            </Button>
          </div>
        ) : (
        <>
        {/* ── Pedido existente ── */}
        {order && order.items && order.items.length > 0 && (
          <div className="mb-4 rounded-xl border border-gray-600 bg-gray-800/50 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-700/50 border-b border-gray-600">
              <div className="flex items-center gap-2">
                <FiClock size={14} className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-200">
                  Pedido #{order.id}
                </span>
              </div>
              {orderStatus && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${orderStatus.badge}`}>
                  {orderStatus.label}
                </span>
              )}
            </div>
            <div className="divide-y divide-gray-700/50">
              {order.items.map(item => (
                <div key={item.id} className="flex items-center justify-between px-3 py-1.5 group">
                  <span className="text-sm text-gray-300">
                    <strong className="text-gray-200">{item.quantity}x</strong> {item.item_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {formatCurrency(parseFloat(item.unit_price) * item.quantity)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDeleteItem({ orderId: order.id, itemId: item.id, itemName: item.item_name })
                      }}
                      className="p-1 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Eliminar item"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-3 py-2 border-t border-gray-700/50 bg-gray-700/30">
              <span className="text-xs text-gray-400">Total actual</span>
              <span className="text-sm font-semibold text-gray-200">
                {formatCurrency(existingTotal)}
              </span>
            </div>
          </div>
        )}

        {/* ── Separador "Agregar items" ── */}
        {existingOrder && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-xs font-medium text-gray-500 shrink-0">Agregar items</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>
        )}

        {/* ── Buscador ── */}
        <div className="relative mb-3">
          <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full pl-9 pr-8 py-2.5 text-sm bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        {!searchQuery.trim() && (
          <div className={`flex gap-2 mb-4 overflow-x-auto pb-2 sticky top-0 z-10 ${dark ? 'bg-gray-900' : 'bg-white'}`}>
            {groupedItems.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-primary-600 text-white'
                    : dark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {filteredItems && filteredItems.length > 0 ? (
          <div className="space-y-4 mb-4">
            {filteredItems.map((cat) => (
              <div key={cat.id}>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{cat.name}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-3 flex justify-between items-center hover:shadow-md transition-shadow ${
                        dark ? 'border-gray-600 bg-gray-800' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <p className={`font-medium truncate ${dark ? 'text-gray-100' : ''}`}>{item.name}</p>
                        <p className="text-sm text-primary-600 font-semibold">
                          {formatCurrency(item.price)}
                        </p>
                      </div>
                      <button
                        onClick={() => addToCart(item)}
                        className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 flex-shrink-0"
                      >
                        <FiPlus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !searchQuery.trim() ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {activeGroup?.items.map((item) => (
              <div
                key={item.id}
                className={`border rounded-lg p-3 flex justify-between items-center hover:shadow-md transition-shadow ${
                  dark ? 'border-gray-600 bg-gray-800' : ''
                }`}
              >
                <div className="flex-1 min-w-0 mr-2">
                  <p className={`font-medium truncate ${dark ? 'text-gray-100' : ''}`}>{item.name}</p>
                  <p className="text-sm text-primary-600 font-semibold">
                    {formatCurrency(item.price)}
                  </p>
                </div>
                <button
                  onClick={() => addToCart(item)}
                  className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 flex-shrink-0"
                >
                  <FiPlus size={16} />
                </button>
              </div>
            ))}
            {activeGroup?.items.length === 0 && (
              <p className="text-gray-400 col-span-full text-center py-8">
                No hay productos en esta categoría
              </p>
            )}
          </div>
        ) : (
          <p className="text-gray-400 col-span-full text-center py-8">
            No se encontraron productos con "{searchQuery.trim()}"
          </p>
        )}

        {cart.length > 0 && (
          <div className={`border-t pt-3 ${dark ? 'border-gray-700' : ''}`}>
            <div className="flex items-center gap-2 mb-3">
              <FiShoppingCart size={16} className="text-primary-600" />
              <h3 className={`text-sm font-semibold ${dark ? 'text-gray-200' : ''}`}>Pedido</h3>
              <span className={`ml-auto text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            </div>

            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.menu_item.id} className={`rounded-lg p-2 ${dark ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 min-w-0 mr-1">
                      <span className={`font-medium text-sm truncate ${dark ? 'text-gray-200' : ''}`}>{item.menu_item.name}</span>
                      <button
                        onClick={() => {
                          setNotesModal(item.menu_item.id)
                          setNotesText(item.notes || '')
                        }}
                        className="text-xs text-primary-600 hover:text-primary-800 shrink-0"
                      >
                        Nota
                      </button>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${dark ? 'text-gray-200' : ''}`}>
                      {formatCurrency(item.menu_item.price * item.quantity)}
                    </span>
                  </div>
                  {item.notes && (
                    <p className={`text-xs italic mb-1 ${dark ? 'text-gray-400' : 'text-gray-400'}`}>"{item.notes}"</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.menu_item.id, -1)}
                      className={`p-1 rounded ${dark ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-200 hover:bg-gray-300'}`}
                    >
                      <FiMinus size={12} />
                    </button>
                    <span className={`font-semibold text-sm w-5 text-center ${dark ? 'text-gray-200' : ''}`}>{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.menu_item.id, 1)}
                      className={`p-1 rounded ${dark ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-200 hover:bg-gray-300'}`}
                    >
                      <FiPlus size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className={`flex items-center justify-between py-2 border-t ${dark ? 'border-gray-700' : ''}`}>
              <span className={`font-semibold ${dark ? 'text-gray-200' : ''}`}>Total</span>
              <span className="text-lg font-bold text-primary-600">
                {formatCurrency(cartTotal)}
              </span>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 mt-2"
            >
              <FiSend size={16} />
              {submitting
                ? 'Enviando...'
                : existingOrder
                  ? 'Agregar al Pedido'
                  : 'Crear Pedido'}
            </Button>
          </div>
        )}

        {cart.length === 0 && (
          <div className={`text-center py-8 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            <FiShoppingCart size={32} className="mx-auto mb-2" />
            <p className="text-sm">
              {order ? 'Agregá más productos al pedido' : 'Seleccioná productos del menú'}
            </p>
          </div>
        )}
        </>
        )}
      </Drawer>

      <ConfirmDialog
        isOpen={!!confirmDeleteItem}
        onClose={() => setConfirmDeleteItem(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar item"
        message={
          confirmDeleteItem
            ? `¿Eliminar "${confirmDeleteItem.itemName}" del pedido?`
            : ''
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      <Modal
        isOpen={!!notesModal}
        onClose={() => setNotesModal(null)}
        title="Nota para el producto"
      >
        <textarea
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          className={`w-full border rounded-lg p-2 h-24 resize-none ${dark ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400' : ''}`}
          placeholder="Ej: sin cebolla, bien cocido..."
        />
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="secondary" onClick={() => setNotesModal(null)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              setCart(prev =>
                prev.map(i =>
                  i.menu_item.id === notesModal ? { ...i, notes: notesText } : i
                )
              )
              setNotesModal(null)
            }}
          >
            Guardar
          </Button>
        </div>
      </Modal>
    </>
  )
}
