import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

export default function generateBillPdf(order) {
  if (!order) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // ── Colores ──
  const primary = [59, 130, 246]
  const gray = [107, 114, 128]
  const dark = [31, 41, 55]

  // ── Encabezado ──
  doc.setFontSize(22)
  doc.setTextColor(...primary)
  doc.text('Pizzería El Patio', pageWidth / 2, 30, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(...gray)
  doc.text('Factura simplificada · Comprobante no fiscal', pageWidth / 2, 38, { align: 'center' })

  // ── Línea separadora ──
  doc.setDrawColor(...gray)
  doc.setLineWidth(0.3)
  doc.line(20, 43, pageWidth - 20, 43)

  // ── Datos del pedido ──
  const tableNum = order.table?.number || order.table || '—'
  const date = new Date().toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const time = new Date().toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  doc.setFontSize(10)
  doc.setTextColor(...dark)

  const infoX = 20
  let infoY = 52

  doc.setFont('helvetica', 'bold')
  doc.text(`Pedido #${order.id}`, infoX, infoY)
  doc.setFont('helvetica', 'normal')
  doc.text(`Mesa ${tableNum}`, infoX + 60, infoY)

  infoY += 7
  doc.text(`Fecha: ${date}`, infoX, infoY)
  doc.text(`Hora: ${time}`, infoX + 60, infoY)

  if (order.waiter?.username) {
    infoY += 7
    doc.text(`Mozo: ${order.waiter.username}`, infoX, infoY)
  }

  // ── Tabla de items ──
  const items = order.items?.map((item) => {
    const name = item.item_name || item.menu_item?.name || '—'
    const qty = Number(item.quantity)
    const unitPrice = Number(item.unit_price)
    const total = qty * unitPrice
    return [qty, name, `$ ${unitPrice.toFixed(2)}`, `$ ${total.toFixed(2)}`]
  }) || []

  const subtotal = order.items?.reduce(
    (s, i) => s + Number(i.quantity) * Number(i.unit_price), 0
  ) || 0
  const tax = subtotal * 0.1
  const grandTotal = subtotal + tax

  // Usamos autoTable como función directa en vez del plugin
  autoTable(doc, {
    startY: infoY + 10,
    head: [['Cant.', 'Producto', 'Precio', 'Subtotal']],
    body: items,
    foot: [
      ['', '', 'Subtotal', `$ ${subtotal.toFixed(2)}`],
      ['', '', 'IVA (10%)', `$ ${tax.toFixed(2)}`],
      ['', '', 'Total', `$ ${grandTotal.toFixed(2)}`],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: primary,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: dark,
    },
    footStyles: {
      fillColor: [249, 250, 251],
      textColor: dark,
      fontSize: 9,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
    styles: {
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
    },
  })

  // ── Pie ──
  const lastY = doc.lastAutoTable?.finalY || infoY + 50

  doc.setDrawColor(...gray)
  doc.line(20, lastY + 15, pageWidth - 20, lastY + 15)

  doc.setFontSize(10)
  doc.setTextColor(...gray)
  doc.text('¡Gracias por su visita!', pageWidth / 2, lastY + 25, { align: 'center' })

  doc.setFontSize(8)
  doc.text('Pizzería El Patio · Todos los derechos reservados', pageWidth / 2, lastY + 32, { align: 'center' })

  // ── Descargar ──
  doc.save(`cuenta-pedido-${order.id}.pdf`)
}
