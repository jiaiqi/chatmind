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

  // 按对话轮次计算回复延迟
  // 轮次 = 同一发送者的连续消息
  const turnEnds: { timestamp: number; isSelf: boolean }[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i === sorted.length - 1 || sorted[i].isSelf !== sorted[i + 1].isSelf) {
      turnEnds.push({ timestamp: sorted[i].timestamp, isSelf: sorted[i].isSelf })
    }
  }

  const selfReplyDelays: number[] = []
  const otherReplyDelays: number[] = []

  for (let i = 1; i < turnEnds.length; i++) {
    // 当前轮次第一条 = 上一轮次结束后紧接着的消息
    // 由于我们只记录了轮次结束点，用当前轮次结束 - 上一轮次结束来近似
    // 但实际上更准确的是：当前轮次起点 - 上一轮次终点
    // 当前轮次起点 = sorted 中 isSelf 切换后的第一条
    // 简化：用 turnEnds[i-1] 和 turnEnds[i] 之间的间隔
    const delay = turnEnds[i].timestamp - turnEnds[i - 1].timestamp
    if (delay < 24 * 60 * 60 * 1000) {
      replyDelays.push(delay)
      if (turnEnds[i].isSelf) {
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
