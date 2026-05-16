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
