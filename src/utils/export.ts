import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { escapeHtml } from './html'
import type { DbMessage } from '../db/schema'

export async function exportToImage(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: getComputedStyle(element).backgroundColor || '#ffffff',
  })

  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export async function exportToPDF(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: getComputedStyle(element).backgroundColor || '#ffffff',
  })

  const imgData = canvas.toDataURL('image/png')
  const imgWidth = 210
  const pageHeight = 297
  const imgHeight = (canvas.height * imgWidth) / canvas.width

  const pdf = new jsPDF('p', 'mm', 'a4')
  let heightLeft = imgHeight
  let position = 0

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  pdf.save(`${filename}.pdf`)
}

export function exportToHTML(element: HTMLElement, filename: string): void {
  const styles = Array.from(document.styleSheets)
    .map(sheet => {
      try {
        return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n')
      } catch {
        return ''
      }
    })
    .join('\n')

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(filename)}</title>
  <style>
    ${styles}
    @media print {
      body { margin: 0; padding: 20px; }
    }
  </style>
</head>
<body>
  ${element.innerHTML}
</body>
</html>`

  downloadText(html, `${filename}.html`, 'text/html')
}

export function exportToCSV(messages: DbMessage[], filename: string, sanitize = false): void {
  const header = '时间,发送者,内容,情绪,情绪分数,消息类型'
  const rows = messages.map(m => {
    const sender = sanitize ? (m.isSelf ? '我' : '对方') : m.senderId
    const content = sanitize
      ? m.content.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '[媒体]').replace(/\n/g, ' ')
      : m.content.replace(/\n/g, ' ')
    return [
      new Date(m.timestamp).toLocaleString('zh-CN'),
      sender,
      `"${content.replace(/"/g, '""')}"`,
      m.emotion || '',
      m.emotionScore?.toFixed(2) || '',
      m.type || 'text',
    ].join(',')
  })

  const csv = '\uFEFF' + header + '\n' + rows.join('\n')
  downloadText(csv, `${filename}.csv`, 'text/csv')
}

export function sanitizeContent(text: string): string {
  return text
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '[媒体]')
    .replace(/\d{11}/g, '[手机号]')
    .replace(/\d{6,}/g, (match) => match.length >= 15 ? '[卡号]' : match)
}

function downloadText(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const link = document.createElement('a')
  link.download = filename
  link.href = URL.createObjectURL(blob)
  link.click()
  URL.revokeObjectURL(link.href)
}
