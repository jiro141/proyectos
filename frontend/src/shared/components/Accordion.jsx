import { useState, useRef, useEffect } from 'react'
import { FiChevronDown } from 'react-icons/fi'

export default function Accordion({
  items,
  allowMultiple = false,
  dark = false,
  className = '',
}) {
  const [openIds, setOpenIds] = useState(new Set())

  const toggle = (id) => {
    setOpenIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!allowMultiple) next.clear()
        next.add(id)
      }
      return next
    })
  }

  if (!items || items.length === 0) return null

  return (
    <div className={`divide-y divide-gray-700 rounded-xl border ${dark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} ${className}`}>
      {items.map((item) => (
        <AccordionPanel
          key={item.id}
          item={item}
          isOpen={openIds.has(item.id)}
          onToggle={() => toggle(item.id)}
          dark={dark}
        />
      ))}
    </div>
  )
}

function AccordionPanel({ item, isOpen, onToggle, dark }) {
  const contentRef = useRef(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight)
    }
  }, [isOpen, item.content])

  return (
    <div>
      {/* ── HEADER ── */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
          dark
            ? 'hover:bg-gray-700 text-gray-100'
            : 'hover:bg-gray-50 text-gray-900'
        } ${isOpen ? (dark ? 'bg-gray-700' : 'bg-gray-50') : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="font-semibold truncate">{item.title}</span>
          {item.badge != null && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
              dark ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
            }`}>
              {item.badge}
            </span>
          )}
        </div>
        {item.headerActions && (
          <div className="flex items-center gap-1 mr-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {item.headerActions}
          </div>
        )}
        <FiChevronDown
          size={18}
          className={`shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          } ${dark ? 'text-gray-400' : 'text-gray-500'}`}
        />
      </button>

      {/* ── CONTENT (animado) ── */}
      <div
        ref={contentRef}
        style={{ maxHeight: isOpen ? height : 0 }}
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          dark ? 'bg-gray-800' : 'bg-white'
        }`}
      >
        <div className="px-4 py-2">{item.content}</div>
      </div>
    </div>
  )
}
