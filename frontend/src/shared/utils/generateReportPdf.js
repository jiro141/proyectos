import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

/* ─── Cargar imagen del public folder como dataURL ─── */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = url
  })
}

/* ─── Colores de la web ─── */
const COLORS = {
  primary: [234, 88, 12],       // orange-600
  primaryLight: [251, 146, 60], // orange-400
  dark: [31, 41, 55],           // gray-800
  darker: [17, 24, 39],         // gray-900
  gray: [107, 114, 128],        // gray-500
  light: [243, 244, 246],       // gray-100
  white: [255, 255, 255],
  emerald: [16, 185, 129],      // emerald-500
  blue: [59, 130, 246],         // blue-500
  purple: [139, 92, 246],       // purple-500
  amber: [245, 158, 11],        // amber-500
}

/* ─── Nombre del método de pago ─── */
const METHOD_LABELS = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
}

/* ─── Ícono textual para método de pago ─── */
const METHOD_ICONS = {
  cash: '$',
  card: '💳',
  transfer: '🏦',
}

export default async function generateReportPdf(reportData, origin) {
  if (!reportData) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2

  // ── Cargar logo ──
  const logoDataUrl = await loadImage('/logo.png').catch(() => null)

  // ═══════════════ HEADER ═══════════════
  // Barra naranja superior
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, pageWidth, 8, 'F')

  // Logo + título
  let headerX = margin
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', headerX, 14, 16, 16)
    headerX = 42
  }
  doc.setFontSize(20)
  doc.setTextColor(...COLORS.primary)
  doc.text('Pizzería El Patio', headerX, 25)

  doc.setFontSize(10)
  doc.setTextColor(...COLORS.gray)
  doc.text('Reporte de Ventas', margin, 33)

  // Fecha de generación
  const now = new Date()
  const dateStr = now.toLocaleDateString('es-AR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const timeStr = now.toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit',
  })

  doc.setFontSize(8)
  doc.setTextColor(...COLORS.gray)
  doc.text(`Generado el ${dateStr} a las ${timeStr}`, pageWidth - margin, 33, { align: 'right' })

  // ═══════════════ RESUMEN ═══════════════
  const { summary, by_payment_method, sales } = reportData
  let y = 46

  doc.setFillColor(...COLORS.light)
  doc.roundedRect(margin, y - 2, contentWidth, 32, 2, 2, 'F')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.dark)
  doc.text('Resumen de Ventas', margin + 4, y + 4)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...COLORS.dark)

  const summaryItems = [
    { label: 'Total de Ventas', value: `$ ${Number(summary.total_sales).toFixed(2)}`, color: COLORS.emerald },
    { label: 'Transacciones', value: String(summary.total_transactions), color: COLORS.blue },
    { label: 'Ticket Promedio', value: `$ ${Number(summary.average_ticket).toFixed(2)}`, color: COLORS.primary },
  ]

  const itemWidth = contentWidth / 3
  summaryItems.forEach((item, i) => {
    const x = margin + i * itemWidth
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.gray)
    doc.setFont('helvetica', 'normal')
    doc.text(item.label, x + 4, y + 15)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...item.color)
    doc.text(item.value, x + 4, y + 26)
  })

  y += 38

  // ═══════════════ DESGLOSE POR MÉTODO DE PAGO ═══════════════
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.dark)
  doc.text('Ventas por Método de Pago', margin, y)

  y += 6

  const methodEntries = Object.entries(by_payment_method || {})
  if (methodEntries.length === 0) {
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.gray)
    doc.text('No hay ventas registradas', margin, y + 6)
    y += 12
  } else {
    const methodRows = methodEntries.map(([method, data]) => [
      METHOD_ICONS[method] || '',
      METHOD_LABELS[method] || method,
      String(data.count),
      `$ ${Number(data.total).toFixed(2)}`,
    ])

    autoTable(doc, {
      startY: y,
      head: [['', 'Método', 'Cantidad', 'Total']],
      body: methodRows,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.dark,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 30, halign: 'center' },
        3: { cellWidth: 35, halign: 'right' },
      },
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      },
    })

    // Total de métodos (fila extra)
    const methodTotal = methodEntries.reduce((s, [, d]) => s + Number(d.total), 0)
    const methodCount = methodEntries.reduce((s, [, d]) => s + d.count, 0)
    doc.setFillColor(...COLORS.light)
    doc.rect(margin, doc.lastAutoTable.finalY, contentWidth, 7, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.dark)
    doc.text('Total', margin + contentWidth - 75, doc.lastAutoTable.finalY + 5)
    doc.text(String(methodCount), margin + contentWidth - 45, doc.lastAutoTable.finalY + 5, { align: 'center' })
    doc.text(`$ ${methodTotal.toFixed(2)}`, margin + contentWidth - 5, doc.lastAutoTable.finalY + 5, { align: 'right' })

    y = doc.lastAutoTable.finalY + 14
  }

  // ═══════════════ HISTORIAL DE VENTAS ═══════════════
  // Check if we need a new page
  if (y > 240) {
    doc.addPage()
    y = 20
  }

  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...COLORS.dark)
  doc.text('Historial de Ventas', margin, y)

  y += 6

  if (!sales || sales.length === 0) {
    doc.setFontSize(9)
    doc.setTextColor(...COLORS.gray)
    doc.text('No hay ventas registradas', margin, y + 6)
  } else {
    const salesRows = sales.map((sale) => [
      `#${sale.bill_id}`,
      sale.paid_at
        ? new Date(sale.paid_at).toLocaleDateString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
          })
        : '—',
      sale.paid_at
        ? new Date(sale.paid_at).toLocaleTimeString('es-AR', {
            hour: '2-digit', minute: '2-digit',
          })
        : '—',
      `Mesa ${sale.table_number}`,
      METHOD_LABELS[sale.payment_method] || sale.payment_method_display || sale.payment_method,
      sale.cashier_name || '—',
      `$ ${Number(sale.total).toFixed(2)}`,
    ])

    autoTable(doc, {
      startY: y,
      head: [['Cuenta', 'Fecha', 'Hora', 'Mesa', 'Método', 'Cajero', 'Total']],
      body: salesRows,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: COLORS.dark,
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 26, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 26, halign: 'center' },
        5: { cellWidth: 28 },
        6: { cellWidth: 32, halign: 'right' },
      },
      margin: { left: margin, right: margin },
      styles: {
        cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
        fontSize: 8,
      },
      didDrawPage: (data) => {
        // Header en páginas siguientes
        doc.setFillColor(...COLORS.primary)
        doc.rect(0, 0, pageWidth, 6, 'F')
      },
    })

    // ═══════════════ TOTAL GENERAL AL FINAL ═══════════════
    const tableEnd = doc.lastAutoTable.finalY + 4
    doc.setFillColor(...COLORS.primary)
    doc.roundedRect(margin, tableEnd, contentWidth, 8, 2, 2, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...COLORS.white)
    doc.text('TOTAL GENERAL', margin + 8, tableEnd + 5.5)
    doc.text(`$ ${Number(summary.total_sales).toFixed(2)}`, pageWidth - margin - 8, tableEnd + 5.5, { align: 'right' })

    y = tableEnd + 16
  }

  // ═══════════════ PIE ═══════════════
  const finalY = Math.max(y, doc.lastAutoTable?.finalY || y) + 6

  doc.setFillColor(...COLORS.primary)
  doc.rect(0, finalY, pageWidth, 4, 'F')

  doc.setFontSize(9)
  doc.setTextColor(...COLORS.gray)
  doc.text('Pizzería El Patio · Reporte generado automáticamente', pageWidth / 2, finalY + 12, { align: 'center' })

  doc.setFontSize(8)
  doc.setTextColor(...COLORS.gray)
  doc.text(`Documento generado el ${dateStr} a las ${timeStr}`, pageWidth / 2, finalY + 18, { align: 'center' })

  // ── Descargar ──
  const filename = `reporte-ventas-${now.toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}
