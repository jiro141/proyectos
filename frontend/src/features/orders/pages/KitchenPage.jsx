import { useEffect, useMemo, useState } from 'react'
import { useOrderStore } from '../store/useOrderStore'
import useOrderSocket from '../../../shared/hooks/useOrderSocket'
import OrderDetailPanel from '../../../shared/components/OrderDetailPanel'
import Button from '../../../shared/components/Button'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { FiClock, FiCheck, FiChevronRight, FiRefreshCw } from 'react-icons/fi'

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

export default function KitchenPage() {
  const { orders, loading, fetchOrders, updateItemStatus, selectedOrderId, setSelectedOrderId } = useOrderStore()
  useOrderSocket()

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(() => fetchOrders(), 15000)
    return () => clearInterval(interval)
  }, [])

  const pendingOrders = useMemo(() =>
    orders.filter(o => o.items?.some(i => i.status === 'pending')),
    [orders]
  )

  const preparingOrders = useMemo(() =>
    orders.filter(o => o.items?.some(i => i.status === 'preparing')),
    [orders]
  )

  const readyOrders = useMemo(() =>
    orders.filter(o => o.items?.some(i => i.status === 'ready')),
    [orders]
  )

  const handleItemStatus = (itemId, status) => {
    updateItemStatus(itemId, status)
  }

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId) return

    const validTransitions = {
      pending: 'preparing',
      preparing: 'ready',
    }

    const expectedDest = validTransitions[source.droppableId]
    if (!expectedDest || destination.droppableId !== expectedDest) return

    const orderId = parseInt(draggableId)
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    const itemsToUpdate = order.items?.filter(i => i.status === source.droppableId) || []
    itemsToUpdate.forEach(item => {
      updateItemStatus(item.id, expectedDest)
    })
  }

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId),
    [orders, selectedOrderId]
  )

  const kitchenActions = useMemo(() => {
    if (!selectedOrder) return null

    const hasPending = selectedOrder.items?.some(i => i.status === 'pending')
    const hasPreparing = selectedOrder.items?.some(i => i.status === 'preparing')

    return (
      <>
        {hasPending && (
          <Button
            onClick={() => {
              selectedOrder.items
                .filter(i => i.status === 'pending')
                .forEach(item => handleItemStatus(item.id, 'preparing'))
            }}
            className="w-full flex items-center justify-center gap-2"
          >
            <FiChevronRight size={16} />
            Iniciar Preparación
          </Button>
        )}
        {hasPreparing && (
          <Button
            onClick={() => {
              selectedOrder.items
                .filter(i => i.status === 'preparing')
                .forEach(item => handleItemStatus(item.id, 'ready'))
            }}
            className="w-full flex items-center justify-center gap-2"
            variant="success"
          >
            <FiCheck size={16} />
            Marcar como Listo
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
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Cocina</h1>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-800"
        >
          <FiRefreshCw size={14} />
          Actualizar
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex md:grid overflow-x-auto md:overflow-hidden gap-4 h-[calc(100vh-10rem)] md:grid-cols-2 lg:grid-cols-3 snap-x snap-mandatory">
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
                                      {col.filterStatus === 'pending' && (
                                        <button
                                          onClick={() => handleItemStatus(item.id, 'preparing')}
                                          className="flex items-center gap-1 text-sm bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 shrink-0"
                                        >
                                          <FiChevronRight size={14} />
                                          Preparando
                                        </button>
                                      )}
                                      {col.filterStatus === 'preparing' && (
                                        <button
                                          onClick={() => handleItemStatus(item.id, 'ready')}
                                          className="flex items-center gap-1 text-sm bg-emerald-600 text-white px-3 py-1 rounded-full hover:bg-emerald-700 shrink-0"
                                        >
                                          <FiCheck size={14} />
                                          Listo
                                        </button>
                                      )}
                                      {col.filterStatus === 'ready' && (
                                        <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium shrink-0">
                                          <FiCheck size={14} />
                                          Completado
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

      <OrderDetailPanel actions={kitchenActions} />
    </div>
  )
}
