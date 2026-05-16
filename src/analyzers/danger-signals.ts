import type { DbMessage } from '../db/schema'
import type { DangerSignal } from '../types/analysis'

export function detectDangerSignals(messages: DbMessage[]): DangerSignal[] {
  if (messages.length < 50) return []

  const signals: DangerSignal[] = []
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)

  // 1. 倾诉不对等：一方消息量占比超过 70%
  const selfCount = sorted.filter(m => m.isSelf).length
  const selfRatio = selfCount / sorted.length

  if (selfRatio > 0.7) {
    signals.push({
      signal: '倾诉不对等',
      severity: 'medium',
      evidence: `你的消息占总数的 ${(selfRatio * 100).toFixed(1)}%，对方回应明显偏少`,
    })
  } else if (selfRatio < 0.3) {
    signals.push({
      signal: '倾诉不对等',
      severity: 'medium',
      evidence: `对方消息占总数的 ${((1 - selfRatio) * 100).toFixed(1)}%，你回应明显偏少`,
    })
  }

  // 2. 连续沉默期：超过 7 天无交流
  const silentPeriods = findSilentPeriods(sorted, 7)
  if (silentPeriods.length > 0) {
    const maxSilent = Math.max(...silentPeriods.map(p => p.days))
    signals.push({
      signal: '连续沉默期',
      severity: maxSilent > 14 ? 'high' : 'medium',
      evidence: `最长 ${maxSilent} 天无交流，共发现 ${silentPeriods.length} 次超过 7 天的沉默`,
    })
  }

  // 3. 负面词汇突增（近 30 天 vs 前 30 天）
  const negativeKeywords = ['烦', '讨厌', '失望', '难过', '生气', '滚', '分手', '离婚', '够了', '别说了']
  const recentNegative = countKeywordInLastNDays(sorted, 30, negativeKeywords)
  const previousNegative = countKeywordInPreviousNDays(sorted, 30, 30, negativeKeywords)

  if (recentNegative > previousNegative * 2 && recentNegative >= 5) {
    signals.push({
      signal: '负面表达激增',
      severity: 'high',
      evidence: `近 30 天负面表达 ${recentNegative} 次，是前 30 天的 ${(recentNegative / Math.max(previousNegative, 1)).toFixed(1)} 倍`,
    })
  }

  // 4. 敷衍回应占比过高
  const recentMessages = getLastNDaysMessages(sorted, 30)
  const indifferentCount = recentMessages.filter(m => m.emotion === 'indifferent').length
  const indifferentRatio = recentMessages.length > 0 ? indifferentCount / recentMessages.length : 0

  if (indifferentRatio > 0.3) {
    signals.push({
      signal: '敷衍回应增多',
      severity: 'medium',
      evidence: `近 30 天敷衍/冷淡回应占 ${(indifferentRatio * 100).toFixed(1)}%`,
    })
  }

  // 5. 回复延迟持续拉长
  const turnDelays = calculateTurnDelays(sorted)
  if (turnDelays.length >= 4) {
    const half = Math.floor(turnDelays.length / 2)
    const firstHalf = turnDelays.slice(0, half)
    const secondHalf = turnDelays.slice(half)
    const firstAvg = average(firstHalf)
    const secondAvg = average(secondHalf)

    if (secondAvg > firstAvg * 2 && secondAvg > 30 * 60 * 1000) {
      signals.push({
        signal: '回复速度持续下降',
        severity: 'medium',
        evidence: `近期平均回复时间 ${formatDelay(secondAvg)}，是早期的 ${(secondAvg / firstAvg).toFixed(1)} 倍`,
      })
    }
  }

  return signals.sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
}

function findSilentPeriods(messages: DbMessage[], thresholdDays: number) {
  const periods: { start: number; end: number; days: number }[] = []
  for (let i = 1; i < messages.length; i++) {
    const gap = messages[i].timestamp - messages[i - 1].timestamp
    const days = gap / (24 * 60 * 60 * 1000)
    if (days >= thresholdDays) {
      periods.push({ start: messages[i - 1].timestamp, end: messages[i].timestamp, days: Math.round(days) })
    }
  }
  return periods
}

function countKeywordInLastNDays(messages: DbMessage[], n: number, keywords: string[]) {
  const cutoff = Date.now() - n * 24 * 60 * 60 * 1000
  return messages.filter(m => m.timestamp >= cutoff && keywords.some(k => m.content.includes(k))).length
}

function countKeywordInPreviousNDays(messages: DbMessage[], lastN: number, prevN: number, keywords: string[]) {
  const end = Date.now() - lastN * 24 * 60 * 60 * 1000
  const start = end - prevN * 24 * 60 * 60 * 1000
  return messages.filter(m => m.timestamp >= start && m.timestamp < end && keywords.some(k => m.content.includes(k))).length
}

function getLastNDaysMessages(messages: DbMessage[], n: number) {
  const cutoff = Date.now() - n * 24 * 60 * 60 * 1000
  return messages.filter(m => m.timestamp >= cutoff)
}

function calculateTurnDelays(messages: DbMessage[]) {
  if (messages.length < 2) return []

  const turnEnds: { timestamp: number; isSelf: boolean }[] = []
  for (let i = 0; i < messages.length; i++) {
    if (i === messages.length - 1 || messages[i].isSelf !== messages[i + 1].isSelf) {
      turnEnds.push({ timestamp: messages[i].timestamp, isSelf: messages[i].isSelf })
    }
  }

  const delays: number[] = []
  for (let i = 1; i < turnEnds.length; i++) {
    // 找到轮次i的起点（即轮次i-1结束后的第一条消息）
    // turnEnds[i-1] 是上一轮最后一条，turnEnds[i] 是当前轮最后一条
    // 当前轮起点需要重新找... 简化：用连续轮次终点差近似
    const delay = turnEnds[i].timestamp - turnEnds[i - 1].timestamp
    if (delay < 24 * 60 * 60 * 1000) {
      delays.push(delay)
    }
  }
  return delays
}

function average(arr: number[]) {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
}

function formatDelay(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时`
  return `${Math.floor(hours / 24)}天`
}

function severityRank(s: string): number {
  return s === 'high' ? 3 : s === 'medium' ? 2 : 1
}
