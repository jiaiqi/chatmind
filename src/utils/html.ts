const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const HTML_ESCAPE_RE = /[&<>"']/g

export function escapeHtml(text: string): string {
  return text.replace(HTML_ESCAPE_RE, ch => HTML_ESCAPE_MAP[ch] || ch)
}

export function safeHighlight(text: string, keyword: string): string {
  const escaped = escapeHtml(text)
  if (!keyword) return escaped
  const escapedKeyword = escapeHtml(keyword)
  const re = new RegExp(`(${escapedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return escaped.replace(re, '<mark>$1</mark>')
}
