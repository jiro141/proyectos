const statusConfig = {
  pending:    { label: 'Pendiente',   style: 'bg-amber-100 text-amber-700 border-amber-200' },
  preparing:  { label: 'Preparando',  style: 'bg-sky-100 text-sky-700 border-sky-200' },
  ready:      { label: 'Listo',       style: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  delivered:  { label: 'Entregado',   style: 'bg-gray-100 text-gray-700 border-gray-200' },
  billed:     { label: 'Facturado',   style: 'bg-purple-100 text-purple-700 border-purple-200' },
  cancelled:  { label: 'Cancelado',   style: 'bg-red-100 text-red-700 border-red-200' },
  free:       { label: 'Libre',       style: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  occupied:   { label: 'Ocupada',     style: 'bg-rose-100 text-rose-700 border-rose-200' },
  paid:       { label: 'Pagado',      style: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
}

export default function StatusBadge({ status, className = '' }) {
  const cfg = statusConfig[status] || { label: status, style: 'bg-gray-100 text-gray-700 border-gray-200' }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.style} ${className}`}>
      {cfg.label}
    </span>
  )
}
