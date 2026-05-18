import type { DbMessage } from '../db/schema'
import type { TopicInfo, TopicAnalysisResult } from '../types/analysis'

const TOPIC_GAP_MS = 30 * 60 * 1000

export function analyzeTopics(messages: DbMessage[]): TopicAnalysisResult {
  if (messages.length === 0) {
    return {
      topics: [],
      selfInitiated: 0,
      otherInitiated: 0,
      selfInitiatedRatio: 0,
      avgTopicLength: 0,
      topicSwitchCount: 0,
    }
  }

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  const topics: TopicInfo[] = []

  let topicStart = 0
  for (let i = 1; i <= sorted.length; i++) {
    const isEnd = i === sorted.length
    const gap = isEnd ? Infinity : sorted[i].timestamp - sorted[i - 1].timestamp

    if (gap >= TOPIC_GAP_MS || isEnd) {
      const topicMessages = sorted.slice(topicStart, i)
      topics.push({
        id: topics.length,
        startTime: topicMessages[0].timestamp,
        endTime: topicMessages[topicMessages.length - 1].timestamp,
        initiator: topicMessages[0].isSelf ? 'self' : 'other',
        messageCount: topicMessages.length,
        startContent: topicMessages[0].content.slice(0, 50),
      })
      topicStart = i
    }
  }

  const selfInitiated = topics.filter(t => t.initiator === 'self').length
  const otherInitiated = topics.filter(t => t.initiator === 'other').length
  const totalMessages = topics.reduce((sum, t) => sum + t.messageCount, 0)

  return {
    topics,
    selfInitiated,
    otherInitiated,
    selfInitiatedRatio: topics.length > 0 ? selfInitiated / topics.length : 0,
    avgTopicLength: topics.length > 0 ? totalMessages / topics.length : 0,
    topicSwitchCount: Math.max(0, topics.length - 1),
  }
}
