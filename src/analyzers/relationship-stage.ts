import type { DbMessage } from '../db/schema'
import type { StatisticsResult } from '../types/analysis'

export type RelationshipStage = '蜜月期' | '稳定期' | '倦怠期' | '危机期' | '修复期'

export interface StageIndicator {
  indicator: string
  value: string
  impact: 'positive' | 'negative' | 'neutral'
}

export interface RelationshipStageResult {
  stage: RelationshipStage
  confidence: number
  reasoning: string
  keyIndicators: StageIndicator[]
}

export function determineRelationshipStage(
  messages: DbMessage[],
  stats: StatisticsResult | null,
): RelationshipStageResult {
  if (!stats || messages.length === 0) {
    return {
      stage: '稳定期',
      confidence: 0.5,
      reasoning: '数据不足，暂无法准确判断关系阶段。',
      keyIndicators: [],
    }
  }

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  const totalDays = Math.max(
    1,
    Math.ceil((sorted[sorted.length - 1].timestamp - sorted[0].timestamp) / (24 * 60 * 60 * 1000)),
  )
  const dailyAvg = messages.length / totalDays

  // 分前后两个时间段对比
  const midIndex = Math.floor(sorted.length / 2)
  const firstHalf = sorted.slice(0, midIndex)
  const secondHalf = sorted.slice(midIndex)

  const firstDailyAvg = firstHalf.length / Math.max(1, totalDays / 2)
  const secondDailyAvg = secondHalf.length / Math.max(1, totalDays / 2)

  // 情绪统计
  const emotions = sorted.reduce(
    (acc, m) => {
      if (m.emotion === 'positive' || m.emotion === 'affectionate') acc.positive++
      else if (m.emotion === 'negative' || m.emotion === 'angry' || m.emotion === 'sad') acc.negative++
      else if (m.emotion === 'indifferent') acc.indifferent++
      return acc
    },
    { positive: 0, negative: 0, indifferent: 0 },
  )

  const positiveRatio = emotions.positive / messages.length
  const negativeRatio = emotions.negative / messages.length
  const indifferentRatio = emotions.indifferent / messages.length

  // 近半段 vs 前半段的情绪变化
  const secondEmotions = secondHalf.reduce(
    (acc, m) => {
      if (m.emotion === 'positive' || m.emotion === 'affectionate') acc.positive++
      else if (m.emotion === 'negative' || m.emotion === 'angry' || m.emotion === 'sad') acc.negative++
      return acc
    },
    { positive: 0, negative: 0 },
  )
  const secondPositiveRatio = secondHalf.length > 0 ? secondEmotions.positive / secondHalf.length : 0

  // 回复延迟
  const avgReplyDelay = stats.avgReplyDelay
  const avgReplyMinutes = avgReplyDelay / (60 * 1000)

  // 平均消息长度
  const avgLength = messages.reduce((sum, m) => sum + (m.wordCount || 0), 0) / messages.length

  // 检测危机信号
  const crisisSignals = detectCrisisSignals(sorted, secondHalf, stats)

  // 修复信号
  const repairSignals = detectRepairSignals(firstHalf, secondHalf)

  // ===== 判定逻辑 =====

  // 1. 危机期：负面情绪高 + 危险信号多
  if (negativeRatio > 0.25 || crisisSignals.length >= 2) {
    return buildResult('危机期', 0.75 + Math.min(crisisSignals.length * 0.05, 0.2), [
      '近期负面情绪占比高，或检测到多个危险信号',
      ...crisisSignals.slice(0, 3),
    ], [
      { indicator: '负面情绪占比', value: `${(negativeRatio * 100).toFixed(1)}%`, impact: 'negative' },
      { indicator: '日均消息量', value: `${dailyAvg.toFixed(1)} 条`, impact: dailyAvg < 5 ? 'negative' : 'neutral' },
      { indicator: '平均回复时间', value: `${avgReplyMinutes.toFixed(0)} 分钟`, impact: avgReplyMinutes > 60 ? 'negative' : 'neutral' },
    ])
  }

  // 2. 修复期：前半段有危机迹象，但后半段明显改善
  const firstPositiveRatio = firstHalf.length > 0
    ? firstHalf.filter(m => m.emotion === 'positive' || m.emotion === 'affectionate').length / firstHalf.length
    : 0
  if (repairSignals.length >= 2 && secondPositiveRatio > firstPositiveRatio) {
    return buildResult('修复期', 0.7, [
      '前半段关系存在压力，但近期有明显改善迹象',
      ...repairSignals.slice(0, 2),
    ], [
      { indicator: '近期正面情绪', value: `${(secondPositiveRatio * 100).toFixed(1)}%`, impact: 'positive' },
      { indicator: '消息量变化', value: `${secondDailyAvg >= firstDailyAvg ? '上升' : '下降'}`, impact: secondDailyAvg >= firstDailyAvg ? 'positive' : 'negative' },
    ])
  }

  // 3. 倦怠期：互动减少 + 简短回应多 + 情绪平淡
  if ((secondDailyAvg < firstDailyAvg * 0.7 && secondDailyAvg < 10) || indifferentRatio > 0.3 || avgLength < 8) {
    return buildResult('倦怠期', 0.7, [
      '互动频率下降或回应变得简短敷衍',
      '可能进入了关系的平淡期',
    ], [
      { indicator: '近期日均消息', value: `${secondDailyAvg.toFixed(1)} 条`, impact: secondDailyAvg < 5 ? 'negative' : 'neutral' },
      { indicator: '敷衍回应占比', value: `${(indifferentRatio * 100).toFixed(1)}%`, impact: indifferentRatio > 0.3 ? 'negative' : 'neutral' },
      { indicator: '平均消息长度', value: `${avgLength.toFixed(1)} 字`, impact: avgLength < 8 ? 'negative' : 'neutral' },
    ])
  }

  // 4. 蜜月期：高频互动 + 情绪积极 + 回复快 + 消息长
  if (dailyAvg > 20 && positiveRatio > 0.4 && avgReplyMinutes < 15 && avgLength > 12) {
    return buildResult('蜜月期', 0.75, [
      '互动频繁，情绪积极，沟通深入',
      '关系处于热烈阶段',
    ], [
      { indicator: '日均消息量', value: `${dailyAvg.toFixed(1)} 条`, impact: 'positive' },
      { indicator: '正面情绪占比', value: `${(positiveRatio * 100).toFixed(1)}%`, impact: 'positive' },
      { indicator: '平均回复时间', value: `${avgReplyMinutes.toFixed(0)} 分钟`, impact: 'positive' },
    ])
  }

  // 5. 默认：稳定期
  return buildResult('稳定期', 0.65, [
    '互动规律，情绪平稳，有来有往',
    '关系处于平稳发展的状态',
  ], [
    { indicator: '日均消息量', value: `${dailyAvg.toFixed(1)} 条`, impact: 'neutral' },
    { indicator: '正面情绪占比', value: `${(positiveRatio * 100).toFixed(1)}%`, impact: positiveRatio > 0.3 ? 'positive' : 'neutral' },
    { indicator: '平均回复时间', value: `${avgReplyMinutes.toFixed(0)} 分钟`, impact: 'neutral' },
  ])
}

function detectCrisisSignals(allMessages: DbMessage[], recentMessages: DbMessage[], stats: StatisticsResult): string[] {
  const signals: string[] = []

  // 沉默期检测
  const sorted = [...allMessages].sort((a, b) => a.timestamp - b.timestamp)
  let maxGap = 0
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].timestamp - sorted[i - 1].timestamp
    if (gap > maxGap) maxGap = gap
  }
  if (maxGap > 7 * 24 * 60 * 60 * 1000) {
    signals.push('检测到超过7天的连续沉默期')
  }

  // 近段负面情绪激增
  const recentNegativeRatio = recentMessages.filter(m =>
    m.emotion === 'negative' || m.emotion === 'angry' || m.emotion === 'sad'
  ).length / Math.max(1, recentMessages.length)

  const olderMessages = sorted.slice(0, Math.floor(sorted.length * 0.5))
  const olderNegativeRatio = olderMessages.filter(m =>
    m.emotion === 'negative' || m.emotion === 'angry' || m.emotion === 'sad'
  ).length / Math.max(1, olderMessages.length)

  if (recentNegativeRatio > olderNegativeRatio * 2 && recentNegativeRatio > 0.2) {
    signals.push('近期负面情绪是前期的2倍以上')
  }

  // 倾诉不对等
  const selfRatio = stats.selfMessages / stats.totalMessages
  if (selfRatio > 0.7 || selfRatio < 0.3) {
    signals.push(`消息量严重不对等（${(selfRatio * 100).toFixed(0)}% vs ${((1 - selfRatio) * 100).toFixed(0)}%）`)
  }

  // 回复速度持续下降
  if (stats.avgReplyDelay > 30 * 60 * 1000) {
    signals.push('平均回复时间超过30分钟')
  }

  return signals
}

function detectRepairSignals(firstHalf: DbMessage[], secondHalf: DbMessage[]): string[] {
  const signals: string[] = []

  const firstAvgLength = firstHalf.reduce((s, m) => s + (m.wordCount || 0), 0) / Math.max(1, firstHalf.length)
  const secondAvgLength = secondHalf.reduce((s, m) => s + (m.wordCount || 0), 0) / Math.max(1, secondHalf.length)

  if (secondAvgLength > firstAvgLength * 1.2) {
    signals.push('近期消息长度明显增加，沟通意愿回升')
  }

  const firstPositive = firstHalf.filter(m => m.emotion === 'positive' || m.emotion === 'affectionate').length
  const secondPositive = secondHalf.filter(m => m.emotion === 'positive' || m.emotion === 'affectionate').length
  const firstRatio = firstPositive / Math.max(1, firstHalf.length)
  const secondRatio = secondPositive / Math.max(1, secondHalf.length)

  if (secondRatio > firstRatio * 1.3) {
    signals.push('近期正面情绪比例显著上升')
  }

  // 简单的回复延迟计算（基于轮次切换）
  const calculateAvgDelay = (msgs: DbMessage[]): number => {
    const sorted = [...msgs].sort((a, b) => a.timestamp - b.timestamp)
    let totalDelay = 0
    let count = 0
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].isSelf !== sorted[i - 1].isSelf) {
        totalDelay += sorted[i].timestamp - sorted[i - 1].timestamp
        count++
      }
    }
    return count > 0 ? totalDelay / count : 0
  }

  const firstDelay = calculateAvgDelay(firstHalf)
  const secondDelay = calculateAvgDelay(secondHalf)
  if (secondDelay < firstDelay * 0.7) {
    signals.push('近期回复速度明显加快')
  }

  return signals
}

function buildResult(
  stage: RelationshipStage,
  confidence: number,
  reasoningLines: string[],
  indicators: StageIndicator[],
): RelationshipStageResult {
  return {
    stage,
    confidence: Math.min(confidence, 0.95),
    reasoning: reasoningLines.join('；'),
    keyIndicators: indicators,
  }
}
