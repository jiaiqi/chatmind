import type { DbMessage } from '../db/schema'
import { safeHighlight } from '../utils/html'

export interface KeywordTrendPoint {
  date: string
  selfCount: number
  otherCount: number
  totalCount: number
}

export interface KeywordMatch {
  message: DbMessage
  contextBefore: DbMessage[]
  contextAfter: DbMessage[]
}

export function trackKeyword(
  messages: DbMessage[],
  keyword: string,
  granularity: 'day' | 'week' | 'month' = 'day',
): { trend: KeywordTrendPoint[]; matches: KeywordMatch[] } {
  if (!keyword.trim() || messages.length === 0) {
    return { trend: [], matches: [] }
  }

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  const keywordLower = keyword.toLowerCase()

  // 匹配包含关键词的消息
  const matchedMessages: DbMessage[] = []
  const matchedIndices = new Set<number>()

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].content.toLowerCase().includes(keywordLower)) {
      matchedMessages.push(sorted[i])
      matchedIndices.add(i)
    }
  }

  // 按时间聚合
  const groups = new Map<string, { self: number; other: number }>()

  for (const m of matchedMessages) {
    const key = getTimeKey(m.timestamp, granularity)
    const existing = groups.get(key) || { self: 0, other: 0 }
    if (m.isSelf) {
      existing.self++
    } else {
      existing.other++
    }
    groups.set(key, existing)
  }

  const trend: KeywordTrendPoint[] = []
  for (const [date, counts] of groups) {
    trend.push({
      date,
      selfCount: counts.self,
      otherCount: counts.other,
      totalCount: counts.self + counts.other,
    })
  }

  trend.sort((a, b) => a.date.localeCompare(b.date))

  // 上下文匹配（前后各2条消息）
  const matches: KeywordMatch[] = []
  for (const index of matchedIndices) {
    const contextBefore = sorted.slice(Math.max(0, index - 2), index)
    const contextAfter = sorted.slice(index + 1, Math.min(sorted.length, index + 3))
    matches.push({
      message: sorted[index],
      contextBefore,
      contextAfter,
    })
  }

  return { trend, matches }
}

function getTimeKey(timestamp: number, granularity: 'day' | 'week' | 'month'): string {
  const d = new Date(timestamp)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')

  switch (granularity) {
    case 'day':
      return `${year}-${month}-${String(d.getDate()).padStart(2, '0')}`
    case 'week': {
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`
    }
    case 'month':
      return `${year}-${month}`
  }
}

export function highlightKeyword(text: string, keyword: string): string {
  return safeHighlight(text, keyword)
}
