import type { DbMessage } from '../db/schema'
import type { StatisticsResult } from '../types/analysis'
import { getLatestTimestamp } from '../utils/date'

export interface RelationshipScore {
  total: number
  breakdown: {
    balance: number
    positivity: number
    responsiveness: number
    consistency: number
    depth: number
  }
  interpretation: string
}

export function calculateRelationshipScore(
  messages: DbMessage[],
  stats: StatisticsResult,
): RelationshipScore {
  if (messages.length < 10) {
    return {
      total: 0,
      breakdown: { balance: 0, positivity: 0, responsiveness: 0, consistency: 0, depth: 0 },
      interpretation: '消息量不足，无法评估',
    }
  }

  // 1. 互动平衡度 (0-100)
  const selfRatio = stats.selfRatio
  const balance = 100 - Math.abs(selfRatio - 0.5) * 200

  // 2. 情绪正向度 (0-100)
  const positiveCount = messages.filter(m => m.emotion === 'positive' || m.emotion === 'affectionate').length
  const negativeCount = messages.filter(m => m.emotion === 'negative' || m.emotion === 'angry' || m.emotion === 'sad').length
  const totalWithEmotion = positiveCount + negativeCount
  const positivity = totalWithEmotion > 0 ? (positiveCount / totalWithEmotion) * 100 : 50

  // 3. 回复及时性 (0-100)
  const avgDelay = stats.avgReplyDelay
  let responsiveness = 100
  if (avgDelay > 5 * 60 * 1000) responsiveness = 80
  if (avgDelay > 30 * 60 * 1000) responsiveness = 60
  if (avgDelay > 2 * 60 * 60 * 1000) responsiveness = 40
  if (avgDelay > 12 * 60 * 60 * 1000) responsiveness = 20

  // 4. 互动稳定性 (0-100) - 用近 30 天 vs 前 30 天的消息量变化衡量
  const now = getLatestTimestamp(messages)
  const recent30 = messages.filter(m => m.timestamp >= now - 30 * 24 * 60 * 60 * 1000).length
  const prev30 = messages.filter(
    m => m.timestamp >= now - 60 * 24 * 60 * 60 * 1000 && m.timestamp < now - 30 * 24 * 60 * 60 * 1000,
  ).length
  let consistency = 70
  if (prev30 > 0) {
    const ratio = recent30 / prev30
    if (ratio > 0.8 && ratio < 1.5) consistency = 90
    else if (ratio > 0.5 && ratio < 2) consistency = 70
    else if (ratio > 0.2) consistency = 50
    else consistency = 30
  }

  // 5. 聊天深度 (0-100) - 平均消息长度
  const avgLen = (stats.avgLength.self + stats.avgLength.other) / 2
  let depth = 50
  if (avgLen > 50) depth = 80
  if (avgLen > 20) depth = 60
  if (avgLen < 10) depth = 30

  // 加权总分
  const total = Math.round(
    balance * 0.25 + positivity * 0.25 + responsiveness * 0.2 + consistency * 0.15 + depth * 0.15,
  )

  const interpretation = getInterpretation(total, balance, positivity, responsiveness)

  return {
    total: Math.min(100, Math.max(0, total)),
    breakdown: {
      balance: Math.round(balance),
      positivity: Math.round(positivity),
      responsiveness: Math.round(responsiveness),
      consistency: Math.round(consistency),
      depth: Math.round(depth),
    },
    interpretation,
  }
}

function getInterpretation(total: number, balance: number, positivity: number, responsiveness: number): string {
  if (total >= 80) return '关系状态良好，保持当前互动节奏即可'
  if (total >= 60) {
    if (balance < 50) return '整体尚可，但互动不平衡需要关注'
    if (positivity < 50) return '整体尚可，但近期负面情绪偏多'
    if (responsiveness < 50) return '整体尚可，但回复速度有所下降'
    return '关系状态平稳，有小幅改善空间'
  }
  if (total >= 40) {
    const issues: string[] = []
    if (balance < 50) issues.push('互动不平衡')
    if (positivity < 50) issues.push('负面情绪偏多')
    if (responsiveness < 50) issues.push('回复不够及时')
    return `关系出现预警信号：${issues.join('、')}`
  }
  return '关系状态堪忧，建议主动沟通改善'
}
