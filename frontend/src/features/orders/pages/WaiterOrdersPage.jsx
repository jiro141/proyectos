import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '../../auth/store/useAuthStore'
import { useOrderStore } from '../store/useOrderStore'
import OrderDetailPanel from '../../../shared/components/OrderDetailPanel'
import Button from '../../../shared/components/Button'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { FiClock, FiCheck, FiSend, FiRefreshCw } from 'react-icons/fi'

function TimeSince({ date }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  const diff = now - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)

  if (mins < 1) return '< 1 min'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

export default function WaiterOrdersPage() {
  const { user } = useAuthStore()
  const { orders, loading, fetchOrders, updateItemStatus, selectedOrderId, setSelectedOrderId } = useOrderStore()

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(() => fetchOrders(), 15000)
    return () => clearInterval(interval)
  }, [])

  const isAdmin = user?.role === 'admin' || user?.is_superuser

  const myOrders = useMemo(() => {
    if (isAdmin) return orders
    return orders.filter(o => o.waiter === user?.id)
  }, [orders, user?.id, isAdmin])

  const pendingOrders = useMemo(() =>
    myOrders.filter(o => o.items?.some(i => i.status === 'pending')),
    [myOrders]
  )

  const preparingOrders = useMemo(() =>
    myOrders.filter(o => o.items?.some(i => i.status === 'preparing')),
    [myOrders]
  )

  const readyOrders = useMemo(() =>
    myOrders.filter(o => o.items?.some(i => i.status === 'ready')),
    [myOrders]
  )

  const handleDeliver = (itemId) => {
    updateItemStatus(itemId, 'delivered')
  }

  const deliveredOrders = useMemo(() =>
    myOrders.filter(o => o.items?.some(i => i.status === 'delivered')),
    [myOrders]
  )

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId) return

    const validTransitions = {
      pending: 'preparing',
      preparing: 'ready',
      ready: 'delivered',
    }

    const expectedDest = validTransitions[source.droppableId]
    if (!expectedDest || destination.droppableId !== expectedDest) return

    const orderId = parseInt(draggableId)
    const currentOrders = useOrderStore.getState().orders
    const order = currentOrders.find(o => o.id === orderId)
    if (!order) return

    const itemsToUpdate = order.items?.filter(i => i.status === source.droppableId) || []
    const { updateItemStatus: updateStatus } = useOrderStore.getState()
    itemsToUpdate.forEach(item => {
      updateStatus(item.id, expectedDest)
    })
  }

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId),
    [orders, selectedOrderId]
  )

  const waiterActions = useMemo(() => {
    if (!selectedOrder) return null

    const hasPreparing = selectedOrder.items?.some(i => i.status === 'preparing')
    const hasReady = selectedOrder.items?.some(i => i.status === 'ready')

    return (
      <>
        {hasPreparing && (
          <Button
            onClick={() => {
              selectedOrder.items
                .filter(i => i.status === 'preparing')
                .forEach(item => updateItemStatus(item.id, 'ready'))
            }}
            className="w-full flex items-center justify-center gap-2"
            variant="success"
          >
            <FiCheck size={16} />
            Marcar como Listo
          </Button>
        )}
        {hasReady && (
          <Button
            onClick={() => {
              selectedOrder.items
                .filter(i => i.status === 'ready')
                .forEach(item => handleDeliver(item.id))
            }}
            className="w-full flex items-center justify-center gap-2"
          >
            <FiSend size={16} />
            Entregar Todo
          </Button>
        )}
      </>
    )
  }, [selectedOrder])

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando pedidos...</p>
      </div>
    )
  }

  const columns = [
    {
      key: 'pending',
      title: 'Pendientes',
      orders: pendingOrders,
      bg: 'bg-amber-900/20',
      border: 'border-amber-700',
      headerBg: 'bg-amber-900/40',
      indicatorColor: 'bg-amber-400',
      emptyText: 'No hay pedidos pendientes',
      filterStatus: 'pending',
    },
    {
      key: 'preparing',
      title: 'En Preparación',
      orders: preparingOrders,
      bg: 'bg-blue-900/20',
      border: 'border-blue-700',
      headerBg: 'bg-blue-900/40',
      indicatorColor: 'bg-blue-400',
      emptyText: 'No hay pedidos en preparación',
      filterStatus: 'preparing',
    },
    {
      key: 'ready',
      title: 'Listos',
      orders: readyOrders,
      bg: 'bg-emerald-900/20',
      border: 'border-emerald-700',
      headerBg: 'bg-emerald-900/40',
      indicatorColor: 'bg-emerald-400',
      emptyText: 'No hay pedidos listos',
      filterStatus: 'ready',
    },
    {
      key: 'delivered',
      title: 'Entregados',
      orders: deliveredOrders,
      bg: 'bg-gray-800/40',
      border: 'border-gray-600',
      headerBg: 'bg-gray-700',
      indicatorColor: 'bg-gray-400',
      emptyText: 'No hay pedidos entregados',
      filterStatus: 'delivered',
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Mis Pedidos</h1>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800"
        >
          <FiRefreshCw size={14} />
          Actualizar
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex md:grid overflow-x-auto md:overflow-hidden gap-4 h-[calc(100vh-10rem)] md:grid-cols-2 lg:grid-cols-4 snap-x snap-mandatory">
          {columns.map(col => (
            <Droppable droppableId={col.key} key={col.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`${col.bg} ${col.border} border rounded-xl flex flex-col overflow-hidden snap-start min-w-[280px] md:min-w-0 ${
                    snapshot.isDraggingOver ? 'ring-2 ring-primary-400 shadow-lg' : ''
                  } transition-all`}
                >
                  <div className={`${col.headerBg} px-4 py-3 flex items-center gap-2 rounded-t-xl`}>
                    <span className={`w-3 h-3 rounded-full ${col.indicatorColor}`} />
                    <h2 className="text-lg font-semibold">{col.title}</h2>
                    <span className="ml-auto text-sm font-medium bg-gray-700/60 rounded-full px-2.5 py-0.5">
                      {col.orders.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
                    {col.orders.length === 0 && !snapshot.isDraggingOver ? (
                      <p className="text-gray-400 text-center py-8">{col.emptyText}</p>
                    ) : (
                      col.orders.map((order, index) => (
                        <Draggable
                          key={order.id}
                          draggableId={String(order.id)}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => setSelectedOrderId(order.id)}
                              className={`bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-3 space-y-2 cursor-pointer ${
                                snapshot.isDragging ? 'shadow-xl rotate-2 scale-105' : ''
                              } ${
                                selectedOrderId === order.id ? 'ring-2 ring-primary-500 border-primary-300' : ''
                              } transition-shadow`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-lg font-bold">Mesa {order.table?.number || order.table}</p>
                                  <p className="text-sm text-gray-500">
                                    {order.waiter?.username || 'Mesero'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-gray-500 shrink-0">
                                  <FiClock size={14} />
                                  <TimeSince date={order.created_at} />
                                </div>
                              </div>

                              <div className="space-y-2">
                                {order.items
                                  ?.filter(i => i.status === col.filterStatus)
                                  .map(item => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between bg-gray-700 rounded-lg p-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{item.quantity}x</span>
                                        <span>{item.item_name || item.menu_item?.name}</span>
                                      </div>
                                      {col.filterStatus === 'ready' && (
                                        <button
                                          onClick={() => handleDeliver(item.id)}
                                          className="flex items-center gap-1 text-sm bg-emerald-600 text-white px-3 py-1 rounded-full hover:bg-emerald-700 shrink-0"
                                        >
                                          <FiCheck size={14} />
                                          Entregar
                                        </button>
                                      )}
                                      {col.filterStatus === 'delivered' && (
                                        <span className="flex items-center gap-1 text-sm text-gray-500 font-medium shrink-0">
                                          <FiSend size={14} />
                                          Entregado
                                        </span>
                                      )}
                                    </div>
                                  ))}
                              </div>

                              {order.notes && (
                                <p className="text-sm text-gray-400 italic">Nota: {order.notes}</p>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <OrderDetailPanel actions={waiterActions} />
    </div>
  )
}
