import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import QRCode from 'qrcode'

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
  primary: [234, 88, 12],    // orange-600 (#ea580c)
  primaryLight: [251, 146, 60], // orange-400 (#fb923c)
  dark: [31, 41, 55],        // gray-800 (#1f2937)
  gray: [107, 114, 128],     // gray-500 (#6b7280)
  light: [243, 244, 246],    // gray-100 (#f3f4f6)
  white: [255, 255, 255],
}

export default async function generateBillPdf(order, billId, origin) {
  if (!order) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // ── Cargar logo y QR en paralelo ──
  const [logoDataUrl, qrDataUrl] = await Promise.all([
    loadImage('/logo.png').catch(() => null),
    QRCode.toDataURL(`${origin}/cuenta/${billId}`, {
      width: 200,
      margin: 1,
      color: { dark: '#1f2937', light: '#ffffff' },
    }).catch(() => null),
  ])

  // ═══════════════ HEADER ═══════════════
  // Barra naranja superior
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, pageWidth, 8, 'F')

  // Logo + nombre
  let logoX = 20
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', logoX, 14, 18, 18)
    logoX = 44
  }
  doc.setFontSize(20)
  doc.setTextColor(...COLORS.primary)
  doc.text('Pizzería El Patio', logoX, 27)

  doc.setFontSize(9)
  doc.setTextColor(...COLORS.gray)
  doc.text('Comprobante no fiscal · Factura simplificada', 20, 34)

  // ═══════════════ DATOS DEL PEDIDO ═══════════════
  const tableNum = order.table?.number || order.table || '—'
  const date = new Date().toLocaleDateString('es-AR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const time = new Date().toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit',
  })

  let infoY = 46

  // Fondo sutil para info
  doc.setFillColor(...COLORS.light)
  doc.roundedRect(20, infoY - 4, pageWidth - 40, qrDataUrl ? 28 : 22, 2, 2, 'F')

  doc.setFontSize(10)
  doc.setTextColor(...COLORS.dark)

  doc.setFont('helvetica', 'bold')
  doc.text(`Pedido #${order.id}`, 24, infoY + 2)
  doc.setFont('helvetica', 'normal')

  // Si hay QR, lo ponemos a la derecha de la info
  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', pageWidth - 42, infoY - 2, 20, 20)
  }

  doc.text(`Mesa ${tableNum}`, 70, infoY + 2)
  infoY += 7
  doc.text(`Fecha: ${date}`, 24, infoY)
  doc.text(`Hora: ${time}`, 70, infoY)

  if (order.waiter?.username) {
    infoY += 7
    doc.text(`Mozo: ${order.waiter.username}`, 24, infoY)
  }

  // ═══════════════ TABLA DE ITEMS ═══════════════
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
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.dark,
    },
    footStyles: {
      fillColor: COLORS.light,
      textColor: COLORS.dark,
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

  // ═══════════════ PIE ═══════════════
  const lastY = doc.lastAutoTable?.finalY || infoY + 50

  // Barra naranja inferior
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, lastY + 12, pageWidth, 4, 'F')

  doc.setFontSize(10)
  doc.setTextColor(...COLORS.gray)
  doc.text('¡Gracias por su visita!', pageWidth / 2, lastY + 25, { align: 'center' })

  doc.setFontSize(8)
  doc.setTextColor(...COLORS.gray)
  doc.text('Pizzería El Patio · Todos los derechos reservados', pageWidth / 2, lastY + 32, { align: 'center' })

  // ── Descargar ──
  doc.save(`cuenta-pedido-${order.id}.pdf`)
}
