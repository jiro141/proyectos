import { FiAlertTriangle } from 'react-icons/fi'
import Button from './Button'

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  loading = false,
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative rounded-lg shadow-xl w-full max-w-sm mx-4 p-6" style={{ backgroundColor: '#111827' }}>
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center">
            <FiAlertTriangle size={24} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-gray-300 mt-1">{message}</p>
          </div>
          <div className="flex gap-2 w-full">
            <Button variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
              {cancelText}
            </Button>
            <Button variant="danger" onClick={onConfirm} className="flex-1" disabled={loading}>
              {loading ? 'Eliminando...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
