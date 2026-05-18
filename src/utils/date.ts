export function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp)
  return `${formatDate(timestamp)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function getDayKey(timestamp: number): string {
  return formatDate(timestamp)
}

export function getHour(timestamp: number): number {
  return new Date(timestamp).getHours()
}

export function getWeekday(timestamp: number): number {
  return new Date(timestamp).getDay()
}

export function getLatestTimestamp(messages: { timestamp: number }[]): number {
  if (messages.length === 0) return Date.now()
  let max = messages[0].timestamp
  for (let i = 1; i < messages.length; i++) {
    if (messages[i].timestamp > max) max = messages[i].timestamp
  }
  return max
}
