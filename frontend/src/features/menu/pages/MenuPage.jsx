import { useEffect, useState } from 'react'
import { useMenuStore } from '../store/useMenuStore'
import Accordion from '../../../shared/components/Accordion'
import Drawer from '../../../shared/components/Drawer'
import ConfirmDialog from '../../../shared/components/ConfirmDialog'
import Button from '../../../shared/components/Button'
import { formatCurrency } from '../../../shared/utils/formatters'
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiRefreshCw } from 'react-icons/fi'
import toast from 'react-hot-toast'

export default function MenuPage() {
  const { categories, items, loading, fetchMenu, createCategory, deleteCategory, createItem, updateItem, deleteItem } = useMenuStore()

  const [categoryDrawer, setCategoryDrawer] = useState(false)
  const [itemDrawer, setItemDrawer] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [categoryName, setCategoryName] = useState('')

  const [form, setForm] = useState({
    name: '',
    price: '',
    category: '',
    description: '',
    available: true,
  })

  const [deleteCategoryId, setDeleteCategoryId] = useState(null)
  const [deleteItemId, setDeleteItemId] = useState(null)

  useEffect(() => { fetchMenu() }, [])

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) return
    try {
      await createCategory({ name: categoryName })
      setCategoryName('')
      setCategoryDrawer(false)
    } catch {
      toast.error('Error al crear categoría')
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return
    try {
      await deleteCategory(deleteCategoryId)
      setDeleteCategoryId(null)
    } catch {
      toast.error('Error al eliminar categoría')
      setDeleteCategoryId(null)
    }
  }

  const openItemDrawer = (item = null) => {
    if (item) {
      setEditItem(item)
      setForm({
        name: item.name || '',
        price: item.price || '',
        category: item.category || item.category?.id || '',
        description: item.description || '',
        available: item.available !== false,
      })
    } else {
      setEditItem(null)
      setForm({
        name: '',
        price: '',
        category: categories[0]?.id || '',
        description: '',
        available: true,
      })
    }
    setItemDrawer(true)
  }

  const handleSaveItem = async () => {
    if (!form.name || !form.price || !form.category) {
      toast.error('Nombre, precio y categoría son obligatorios')
      return
    }
    const data = {
      name: form.name,
      price: Number(form.price),
      category: form.category,
      description: form.description,
      available: form.available,
    }
    try {
      if (editItem) {
        await updateItem(editItem.id, data)
      } else {
        await createItem(data)
      }
      setItemDrawer(false)
    } catch {
      toast.error('Error al guardar el producto')
    }
  }

  const handleToggleAvailable = async (item) => {
    try {
      await updateItem(item.id, { available: !item.available })
    } catch {
      toast.error('Error al actualizar disponibilidad')
    }
  }

  const handleDeleteItem = async () => {
    if (!deleteItemId) return
    try {
      await deleteItem(deleteItemId)
      setDeleteItemId(null)
    } catch {
      toast.error('Error al eliminar producto')
      setDeleteItemId(null)
    }
  }

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando menú...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Gestión del Menú</h1>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={fetchMenu}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 shrink-0"
          >
            <FiRefreshCw size={14} />
            Actualizar
          </button>
          <Button onClick={() => setCategoryDrawer(true)} className="flex items-center gap-1 shrink-0">
            <FiPlus size={16} />
            Categoría
          </Button>
          <Button onClick={() => openItemDrawer(null)} className="flex items-center gap-1 shrink-0">
            <FiPlus size={16} />
            Producto
          </Button>
        </div>
      </div>

      {categories.length > 0 ? (
        <Accordion
          dark
          allowMultiple
          items={categories.map(cat => {
            const catItems = items.filter(
              i => i.category === cat.id || i.category?.id === cat.id
            )
            return {
              id: cat.id,
              title: cat.name,
              badge: `${catItems.length} ${catItems.length === 1 ? 'producto' : 'productos'}`,
              headerActions: (
                <button
                  onClick={() => setDeleteCategoryId(cat.id)}
                  className="p-1.5 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Eliminar categoría"
                >
                  <FiTrash2 size={15} />
                </button>
              ),
              content: (
                <div className="divide-y divide-gray-700">
                  {catItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2.5 hover:bg-gray-700/50 px-1 rounded-lg transition-colors">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium text-sm ${!item.available ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                            {item.name}
                          </p>
                          <button
                            onClick={() => handleToggleAvailable(item)}
                            className={`p-1 rounded transition-colors ${item.available ? 'text-green-400 hover:bg-green-900/30' : 'text-gray-500 hover:bg-gray-600'}`}
                            title={item.available ? 'Disponible' : 'No disponible'}
                          >
                            <FiToggleLeft size={14} />
                          </button>
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-primary-400 font-semibold text-sm">
                          {formatCurrency(item.price)}
                        </span>
                        <button
                          onClick={() => openItemDrawer(item)}
                          className="p-1.5 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Editar producto"
                        >
                          <FiEdit2 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteItemId(item.id)}
                          className="p-1.5 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Eliminar producto"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {catItems.length === 0 && (
                    <p className="text-gray-500 text-center py-4 text-sm">
                      Sin productos en esta categoría
                    </p>
                  )}
                </div>
              ),
            }
          })}
        />
      ) : (
        <p className="text-gray-400 text-center py-8">
          No hay categorías. Creá una para empezar.
        </p>
      )}

      <Drawer
        isOpen={categoryDrawer}
        onClose={() => setCategoryDrawer(false)}
        title="Nueva Categoría"
        dark
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-200">Nombre</label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white placeholder-gray-400"
              placeholder="Ej: Pizzas, Pastas..."
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCategoryDrawer(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCategory} disabled={!categoryName.trim()}>
              Crear
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer
        isOpen={itemDrawer}
        onClose={() => setItemDrawer(false)}
        title={editItem ? 'Editar Producto' : 'Nuevo Producto'}
        dark
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-200">Nombre *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white placeholder-gray-400"
              placeholder="Nombre del producto"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-200">Precio *</label>
            <input
              type="number"
              value={form.price}
              onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white placeholder-gray-400"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-200">Categoría *</label>
            <select
              value={form.category}
              onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white"
            >
              <option value="">Seleccionar categoría</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-200">Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 h-20 resize-none text-white placeholder-gray-400"
              placeholder="Descripción opcional"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm(f => ({ ...f, available: e.target.checked }))}
              className="rounded bg-gray-700 border-gray-600"
            />
            <span className="text-sm font-medium text-gray-200">Disponible</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setItemDrawer(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveItem}
              disabled={!form.name || !form.price || !form.category}
            >
              {editItem ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </div>
        </div>
      </Drawer>

      <ConfirmDialog
        isOpen={deleteCategoryId !== null}
        onClose={() => setDeleteCategoryId(null)}
        onConfirm={handleDeleteCategory}
        title="Eliminar categoría"
        message="¿Estás seguro de eliminar esta categoría? Esta acción no se puede deshacer."
      />

      <ConfirmDialog
        isOpen={deleteItemId !== null}
        onClose={() => setDeleteItemId(null)}
        onConfirm={handleDeleteItem}
        title="Eliminar producto"
        message="¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer."
      />
    </div>
  )
}
