import type { DbMessage } from '../db/schema'

export type EventType = 'emotion_peak' | 'silence_end' | 'volume_spike' | 'argument' | 'milestone'

export interface ChatEvent {
  date: string
  type: EventType
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  isAuto: boolean
}

const NEGATIVE_EMOTIONS = new Set(['negative', 'angry', 'sad'])

function isNegative(emotion?: string): boolean {
  return !!emotion && NEGATIVE_EMOTIONS.has(emotion)
}

export function detectAutoEvents(messages: DbMessage[]): ChatEvent[] {
  if (messages.length < 20) return []

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  const events: ChatEvent[] = []

  // 1. 情绪极值点
  events.push(...detectEmotionPeaks(sorted))

  // 2. 长时间沉默结束
  events.push(...detectSilenceEnds(sorted))

  // 3. 消息量突变
  events.push(...detectVolumeSpikes(sorted))

  // 4. 争吵事件
  events.push(...detectArguments(sorted))

  // 去重并按日期排序
  const seen = new Set<string>()
  return events
    .filter(e => {
      const key = `${e.date}-${e.type}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

function detectEmotionPeaks(messages: DbMessage[]): ChatEvent[] {
  const events: ChatEvent[] = []
  const dailyEmotions = new Map<string, { negative: number; total: number }>()

  for (const msg of messages) {
    const date = formatDate(msg.timestamp)
    const existing = dailyEmotions.get(date) || { negative: 0, total: 0 }
    existing.total++
    if (isNegative(msg.emotion)) existing.negative++
    dailyEmotions.set(date, existing)
  }

  let maxNegativeRatio = 0
  let peakDate = ''

  for (const [date, stats] of dailyEmotions) {
    if (stats.total >= 5) {
      const ratio = stats.negative / stats.total
      if (ratio > maxNegativeRatio) {
        maxNegativeRatio = ratio
        peakDate = date
      }
    }
  }

  if (peakDate && maxNegativeRatio > 0.5) {
    events.push({
      date: peakDate,
      type: 'emotion_peak',
      title: '情绪低谷',
      description: `当天负面情绪占比 ${(maxNegativeRatio * 100).toFixed(0)}%`,
      severity: maxNegativeRatio > 0.7 ? 'high' : 'medium',
      isAuto: true,
    })
  }

  return events
}

function detectSilenceEnds(messages: DbMessage[]): ChatEvent[] {
  const events: ChatEvent[] = []
  const SILENCE_THRESHOLD = 7 * 24 * 60 * 60 * 1000 // 7天

  for (let i = 1; i < messages.length; i++) {
    const gap = messages[i].timestamp - messages[i - 1].timestamp
    if (gap > SILENCE_THRESHOLD) {
      const days = Math.floor(gap / (24 * 60 * 60 * 1000))
      events.push({
        date: formatDate(messages[i].timestamp),
        type: 'silence_end',
        title: '沉默期结束',
        description: `经过 ${days} 天沉默后恢复交流`,
        severity: days > 14 ? 'high' : 'medium',
        isAuto: true,
      })
    }
  }

  return events
}

function detectVolumeSpikes(messages: DbMessage[]): ChatEvent[] {
  const events: ChatEvent[] = []
  const dailyCounts = new Map<string, number>()

  for (const msg of messages) {
    const date = formatDate(msg.timestamp)
    dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1)
  }

  const counts = Array.from(dailyCounts.values())
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length

  for (const [date, count] of dailyCounts) {
    if (count > avg * 3 && count >= 20) {
      events.push({
        date,
        type: 'volume_spike',
        title: '聊天高峰',
        description: `单日 ${count} 条消息，是平均的 ${(count / avg).toFixed(1)} 倍`,
        severity: 'low',
        isAuto: true,
      })
    }
  }

  return events
}

function detectArguments(messages: DbMessage[]): ChatEvent[] {
  const events: ChatEvent[] = []

  for (let i = 0; i < messages.length - 2; i++) {
    // 检测双方负面情绪交替（至少3轮）
    let rounds = 0
    let lastSender = messages[i].isSelf
    let j = i

    while (j < messages.length) {
      if (isNegative(messages[j].emotion)) {
        if (messages[j].isSelf !== lastSender) {
          rounds++
          lastSender = messages[j].isSelf
        }
        j++
      } else {
        break
      }
    }

    if (rounds >= 3) {
      events.push({
        date: formatDate(messages[i].timestamp),
        type: 'argument',
        title: '争吵事件',
        description: `双方负面情绪交替 ${rounds} 轮`,
        severity: rounds >= 5 ? 'high' : 'medium',
        isAuto: true,
      })
      i = j - 1
    }
  }

  return events
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
