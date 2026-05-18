import type { DbMessage } from '../db/schema'
import type { ParticipantStat, GroupDynamicsResult } from '../types/analysis'
import { getDayKey } from '../utils/date'

export function analyzeGroupDynamics(messages: DbMessage[]): GroupDynamicsResult {
  if (messages.length === 0) {
    return {
      participantStats: [],
      totalParticipants: 0,
      topSender: null,
      activityDistribution: [],
    }
  }

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  const participantMap = new Map<string, {
    senderId: string
    messageCount: number
    totalWords: number
    activeDays: Set<string>
    firstSeen: number
    lastSeen: number
    isSelf: boolean
  }>()

  for (const m of sorted) {
    const existing = participantMap.get(m.senderId)
    if (existing) {
      existing.messageCount++
      existing.totalWords += m.wordCount
      existing.activeDays.add(getDayKey(m.timestamp))
      if (m.timestamp < existing.firstSeen) existing.firstSeen = m.timestamp
      if (m.timestamp > existing.lastSeen) existing.lastSeen = m.timestamp
    } else {
      participantMap.set(m.senderId, {
        senderId: m.senderId,
        messageCount: 1,
        totalWords: m.wordCount,
        activeDays: new Set([getDayKey(m.timestamp)]),
        firstSeen: m.timestamp,
        lastSeen: m.timestamp,
        isSelf: m.isSelf,
      })
    }
  }

  const participantStats: ParticipantStat[] = []
  for (const [, stat] of participantMap) {
    participantStats.push({
      senderId: stat.senderId,
      name: stat.isSelf ? '我' : `用户_${stat.senderId.slice(0, 6)}`,
      messageCount: stat.messageCount,
      totalWords: stat.totalWords,
      avgWordsPerMessage: stat.messageCount > 0 ? stat.totalWords / stat.messageCount : 0,
      activeDays: stat.activeDays.size,
      firstSeen: stat.firstSeen,
      lastSeen: stat.lastSeen,
    })
  }

  participantStats.sort((a, b) => b.messageCount - a.messageCount)

  const topSender = participantStats.length > 0 ? participantStats[0] : null

  const dayMap = new Map<string, Map<string, number>>()
  for (const m of sorted) {
    const dayKey = getDayKey(m.timestamp)
    const dayCounts = dayMap.get(dayKey) || new Map<string, number>()
    dayCounts.set(m.senderId, (dayCounts.get(m.senderId) || 0) + 1)
    dayMap.set(dayKey, dayCounts)
  }

  const activityDistribution: { date: string; counts: Record<string, number> }[] = []
  for (const [date, counts] of dayMap) {
    const countsObj: Record<string, number> = {}
    for (const [senderId, count] of counts) {
      countsObj[senderId] = count
    }
    activityDistribution.push({ date, counts: countsObj })
  }

  activityDistribution.sort((a, b) => a.date.localeCompare(b.date))

  return {
    participantStats,
    totalParticipants: participantStats.length,
    topSender,
    activityDistribution,
  }
}
