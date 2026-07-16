import { useState, useEffect, useCallback } from 'react'
import { FiX } from 'react-icons/fi'

export default function Drawer({ isOpen, onClose, title, children, footer, dark }) {
  const [closing, setClosing] = useState(false)
  const [rendered, setRendered] = useState(false)

  // Cuando isOpen cambia, controlamos la animación de entrada/salida
  useEffect(() => {
    if (isOpen) {
      setRendered(true)
      setClosing(false)
    } else if (rendered) {
      setClosing(true)
      const timer = setTimeout(() => {
        setRendered(false)
        setClosing(false)
      }, 200) // match la duración de slide-out-right
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    setClosing(true)
    const timer = setTimeout(() => {
      setRendered(false)
      setClosing(false)
      onClose()
    }, 200)
  }, [onClose])

  if (!rendered) return null

  const theme = dark ? {
    container: 'bg-gray-900 text-white',
    border: 'border-gray-700',
    closeBtn: 'hover:bg-gray-700',
    title: 'text-lg font-semibold text-white',
  } : {
    container: 'bg-white',
    border: 'border-gray-200',
    closeBtn: 'hover:bg-gray-100',
    title: 'text-lg font-semibold',
  }

  const animClass = closing ? 'animate-slide-out-right' : 'animate-slide-in-right'

  return (
    <div className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={handleClose}
      />
      <div className={`absolute right-0 top-0 h-full w-full max-w-lg shadow-xl flex flex-col ${animClass} ${theme.container}`}>
        <div className={`flex items-center justify-between p-4 border-b ${theme.border}`}>
          <h3 className={theme.title}>{title}</h3>
          <button
            onClick={handleClose}
            className={`p-2 rounded-full transition-colors ${theme.closeBtn}`}
          >
            <FiX size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
        {footer && (
          <div className={`border-t p-4 space-y-2 ${theme.border}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
