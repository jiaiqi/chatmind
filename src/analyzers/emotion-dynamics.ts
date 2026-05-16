import type { DbMessage } from '../db/schema'

export interface EmotionDynamicsResult {
  // 情绪感染度
  contagion: {
    selfToOther: number // 我方负面 → 对方负面的比例
    otherToSelf: number // 对方负面 → 我方负面的比例
    overall: number // 总体感染率
    totalTriggers: number // 总触发次数
    successfulInfections: number // 成功感染次数
  }
  // 情绪修复时间
  recovery: {
    avgRecoveryTime: number // 平均修复时间（毫秒）
    avgRecoveryTimeText: string // 格式化文本
    recoveryCount: number // 修复事件数
    fastestRecovery: number // 最快修复（毫秒）
    slowestRecovery: number // 最慢修复（毫秒）
    unresolvedCount: number // 未修复的负面事件数
  }
  // 情绪对抗模式
  confrontation: {
    escalationCount: number // 情绪升级事件数（双方负面情绪交替）
    deEscalationCount: number // 情绪降级事件数（一方安抚成功）
    avgEscalationRounds: number // 平均升级轮次
  }
}

const NEGATIVE_EMOTIONS = new Set(['negative', 'angry', 'sad'])
const POSITIVE_EMOTIONS = new Set(['positive', 'affectionate'])

function isNegative(emotion?: string): boolean {
  return !!emotion && NEGATIVE_EMOTIONS.has(emotion)
}

function isPositive(emotion?: string): boolean {
  return !!emotion && POSITIVE_EMOTIONS.has(emotion)
}

export function calculateEmotionDynamics(messages: DbMessage[]): EmotionDynamicsResult {
  if (messages.length < 10) {
    return createEmptyResult()
  }

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)

  // 只分析有情绪标签的消息
  const labeledMessages = sorted.filter(m => m.emotion)
  if (labeledMessages.length < 10) {
    return createEmptyResult()
  }

  const contagion = calculateContagion(labeledMessages)
  const recovery = calculateRecovery(labeledMessages)
  const confrontation = calculateConfrontation(labeledMessages)

  return { contagion, recovery, confrontation }
}

function calculateContagion(messages: DbMessage[]) {
  let selfTriggers = 0
  let selfToOtherSuccess = 0
  let otherTriggers = 0
  let otherToSelfSuccess = 0

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]

    // 我方负面情绪触发
    if (msg.isSelf && isNegative(msg.emotion)) {
      selfTriggers++
      // 观察接下来对方的 3 条消息
      const nextOthers = messages
        .slice(i + 1)
        .filter(m => !m.isSelf)
        .slice(0, 3)
      if (nextOthers.some(m => isNegative(m.emotion))) {
        selfToOtherSuccess++
      }
    }

    // 对方负面情绪触发
    if (!msg.isSelf && isNegative(msg.emotion)) {
      otherTriggers++
      // 观察接下来我方的 3 条消息
      const nextSelfs = messages
        .slice(i + 1)
        .filter(m => m.isSelf)
        .slice(0, 3)
      if (nextSelfs.some(m => isNegative(m.emotion))) {
        otherToSelfSuccess++
      }
    }
  }

  const totalTriggers = selfTriggers + otherTriggers
  const successfulInfections = selfToOtherSuccess + otherToSelfSuccess

  return {
    selfToOther: selfTriggers > 0 ? selfToOtherSuccess / selfTriggers : 0,
    otherToSelf: otherTriggers > 0 ? otherToSelfSuccess / otherTriggers : 0,
    overall: totalTriggers > 0 ? successfulInfections / totalTriggers : 0,
    totalTriggers,
    successfulInfections,
  }
}

function calculateRecovery(messages: DbMessage[]) {
  // 找出负面事件片段
  const negativeEvents: { start: number; end: number; messages: DbMessage[] }[] = []
  let currentEvent: DbMessage[] = []

  for (const msg of messages) {
    if (isNegative(msg.emotion)) {
      currentEvent.push(msg)
    } else {
      if (currentEvent.length >= 2) {
        negativeEvents.push({
          start: currentEvent[0].timestamp,
          end: currentEvent[currentEvent.length - 1].timestamp,
          messages: [...currentEvent],
        })
      }
      currentEvent = []
    }
  }
  // 处理末尾的负面事件
  if (currentEvent.length >= 2) {
    negativeEvents.push({
      start: currentEvent[0].timestamp,
      end: currentEvent[currentEvent.length - 1].timestamp,
      messages: [...currentEvent],
    })
  }

  let totalRecoveryTime = 0
  let recoveryCount = 0
  let fastestRecovery = Infinity
  let slowestRecovery = 0
  let unresolvedCount = 0

  for (const event of negativeEvents) {
    // 在事件结束后查找第一条正面消息
    const recoveryMsg = messages.find(m => m.timestamp > event.end && isPositive(m.emotion))

    if (recoveryMsg) {
      const recoveryTime = recoveryMsg.timestamp - event.end
      totalRecoveryTime += recoveryTime
      recoveryCount++
      if (recoveryTime < fastestRecovery) fastestRecovery = recoveryTime
      if (recoveryTime > slowestRecovery) slowestRecovery = recoveryTime
    } else {
      unresolvedCount++
    }
  }

  const avgRecoveryTime = recoveryCount > 0 ? totalRecoveryTime / recoveryCount : 0

  return {
    avgRecoveryTime,
    avgRecoveryTimeText: formatDuration(avgRecoveryTime),
    recoveryCount,
    fastestRecovery: fastestRecovery === Infinity ? 0 : fastestRecovery,
    slowestRecovery,
    unresolvedCount,
  }
}

function calculateConfrontation(messages: DbMessage[]) {
  let escalationCount = 0
  let deEscalationCount = 0
  let totalEscalationRounds = 0

  // 找情绪升级事件：双方负面情绪交替出现
  for (let i = 0; i < messages.length - 1; i++) {
    if (isNegative(messages[i].emotion)) {
      // 统计连续的负面情绪交替轮次
      let rounds = 1
      let lastSender = messages[i].isSelf
      let j = i + 1

      while (j < messages.length) {
        if (isNegative(messages[j].emotion) && messages[j].isSelf !== lastSender) {
          rounds++
          lastSender = messages[j].isSelf
          j++
        } else if (isNegative(messages[j].emotion) && messages[j].isSelf === lastSender) {
          // 同一方连续负面，继续算
          j++
        } else {
          break
        }
      }

      if (rounds >= 3) {
        escalationCount++
        totalEscalationRounds += rounds
      } else if (rounds >= 2) {
        // 检查是否是降级：一方负面后另一方用正面/中性回应
        const nextMsg = messages[j]
        if (nextMsg && (isPositive(nextMsg.emotion) || nextMsg.emotion === 'neutral')) {
          deEscalationCount++
        }
      }

      i = j - 1
    }
  }

  return {
    escalationCount,
    deEscalationCount,
    avgEscalationRounds: escalationCount > 0 ? totalEscalationRounds / escalationCount : 0,
  }
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / (60 * 1000))
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时`
  const days = Math.floor(hours / 24)
  return `${days}天`
}

function createEmptyResult(): EmotionDynamicsResult {
  return {
    contagion: { selfToOther: 0, otherToSelf: 0, overall: 0, totalTriggers: 0, successfulInfections: 0 },
    recovery: { avgRecoveryTime: 0, avgRecoveryTimeText: '-', recoveryCount: 0, fastestRecovery: 0, slowestRecovery: 0, unresolvedCount: 0 },
    confrontation: { escalationCount: 0, deEscalationCount: 0, avgEscalationRounds: 0 },
  }
}
