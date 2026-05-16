import type { DbMessage } from '../db/schema'
import type { EmotionTrendPoint } from '../types/analysis'
import { getDayKey } from '../utils/date'
import { ruleBasedEmotion } from '../utils/emotion-dict'

export function analyzeMessageEmotion(content: string) {
  return ruleBasedEmotion(content)
}

export function analyzeBatchEmotion(messages: DbMessage[]) {
  const results = messages.map(msg => {
    const result = analyzeMessageEmotion(msg.content)
    return {
      messageId: msg.id,
      emotion: result?.label || 'neutral',
      score: result?.score || 0.5,
    }
  })
  return results
}

export function calculateEmotionTrend(
  messages: DbMessage[],
  granularity: 'day' | 'week' | 'month' = 'day',
): EmotionTrendPoint[] {
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  const groups = new Map<string, DbMessage[]>()

  for (const m of sorted) {
    const key = getTimeKey(m.timestamp, granularity)
    const arr = groups.get(key) || []
    arr.push(m)
    groups.set(key, arr)
  }

  const points: EmotionTrendPoint[] = []
  for (const [date, msgs] of groups) {
    const selfMsgs = msgs.filter(m => m.isSelf)
    const otherMsgs = msgs.filter(m => !m.isSelf)

    points.push({
      date,
      selfPositive: countEmotion(selfMsgs, 'positive'),
      selfNegative: countEmotion(selfMsgs, 'negative') + countEmotion(selfMsgs, 'angry') + countEmotion(selfMsgs, 'sad'),
      selfNeutral: countEmotion(selfMsgs, 'neutral') + countEmotion(selfMsgs, 'indifferent'),
      otherPositive: countEmotion(otherMsgs, 'positive'),
      otherNegative: countEmotion(otherMsgs, 'negative') + countEmotion(otherMsgs, 'angry') + countEmotion(otherMsgs, 'sad'),
      otherNeutral: countEmotion(otherMsgs, 'neutral') + countEmotion(otherMsgs, 'indifferent'),
    })
  }

  return points.sort((a, b) => a.date.localeCompare(b.date))
}

function countEmotion(messages: DbMessage[], emotion: string): number {
  return messages.filter(m => m.emotion === emotion).length
}

function getTimeKey(timestamp: number, granularity: 'day' | 'week' | 'month'): string {
  const d = new Date(timestamp)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')

  switch (granularity) {
    case 'day':
      return `${year}-${month}-${String(d.getDate()).padStart(2, '0')}`
    case 'week':
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`
    case 'month':
      return `${year}-${month}`
  }
}
