import type { DbMessage } from '../db/schema'
import type { StatisticsResult } from '../types/analysis'
import { getDayKey, getHour } from '../utils/date'

export function calculateStatistics(messages: DbMessage[]): StatisticsResult {
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)

  const selfMessages = sorted.filter(m => m.isSelf)
  const otherMessages = sorted.filter(m => !m.isSelf)

  const hourlyDistribution = new Array(24).fill(0)
  const dailyDistribution = new Map<string, number>()
  const replyDelays: number[] = []

  let selfLengthSum = 0
  let otherLengthSum = 0
  let selfMaxLength = 0
  let otherMaxLength = 0

  for (const m of sorted) {
    // 时间分布
    hourlyDistribution[getHour(m.timestamp)]++
    const dayKey = getDayKey(m.timestamp)
    dailyDistribution.set(dayKey, (dailyDistribution.get(dayKey) || 0) + 1)

    // 长度统计
    if (m.isSelf) {
      selfLengthSum += m.wordCount
      if (m.wordCount > selfMaxLength) selfMaxLength = m.wordCount
    } else {
      otherLengthSum += m.wordCount
      if (m.wordCount > otherMaxLength) otherMaxLength = m.wordCount
    }
  }

  const turnBoundaries: { firstTimestamp: number; lastTimestamp: number; isSelf: boolean }[] = []
  let turnStart = 0
  for (let i = 0; i < sorted.length; i++) {
    if (i === sorted.length - 1 || sorted[i].isSelf !== sorted[i + 1].isSelf) {
      turnBoundaries.push({
        firstTimestamp: sorted[turnStart].timestamp,
        lastTimestamp: sorted[i].timestamp,
        isSelf: sorted[i].isSelf,
      })
      turnStart = i + 1
    }
  }

  const selfReplyDelays: number[] = []
  const otherReplyDelays: number[] = []

  for (let i = 1; i < turnBoundaries.length; i++) {
    const delay = turnBoundaries[i].firstTimestamp - turnBoundaries[i - 1].lastTimestamp
    if (delay >= 0 && delay < 24 * 60 * 60 * 1000) {
      replyDelays.push(delay)
      if (turnBoundaries[i].isSelf) {
        selfReplyDelays.push(delay)
      } else {
        otherReplyDelays.push(delay)
      }
    }
  }

  const totalMessages = sorted.length
  const avgReplyDelay = replyDelays.length > 0
    ? replyDelays.reduce((a, b) => a + b, 0) / replyDelays.length
    : 0
  const avgSelfReplyDelay = selfReplyDelays.length > 0
    ? selfReplyDelays.reduce((a, b) => a + b, 0) / selfReplyDelays.length
    : 0
  const avgOtherReplyDelay = otherReplyDelays.length > 0
    ? otherReplyDelays.reduce((a, b) => a + b, 0) / otherReplyDelays.length
    : 0

  return {
    totalMessages,
    selfMessages: selfMessages.length,
    otherMessages: otherMessages.length,
    selfRatio: totalMessages > 0 ? selfMessages.length / totalMessages : 0,
    hourlyDistribution,
    dailyDistribution,
    avgLength: {
      self: selfMessages.length > 0 ? selfLengthSum / selfMessages.length : 0,
      other: otherMessages.length > 0 ? otherLengthSum / otherMessages.length : 0,
    },
    maxLength: {
      self: selfMaxLength,
      other: otherMaxLength,
    },
    replyDelays,
    avgReplyDelay,
    avgSelfReplyDelay,
    avgOtherReplyDelay,
  }
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时`
  const days = Math.floor(hours / 24)
  return `${days}天`
}
