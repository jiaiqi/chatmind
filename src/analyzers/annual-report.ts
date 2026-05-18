import type { DbMessage } from '../db/schema'
import type { AnnualReportData } from '../types/analysis'
import { getDayKey, getHour } from '../utils/date'
import { calculateWordFrequency } from './word-frequency'

export function generateAnnualReport(messages: DbMessage[], year?: number): AnnualReportData | null {
  if (messages.length === 0) return null

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)

  const targetYear = year ?? new Date(sorted[sorted.length - 1].timestamp).getFullYear()

  const yearMessages = sorted.filter(m => new Date(m.timestamp).getFullYear() === targetYear)
  if (yearMessages.length === 0) return null

  const selfMessages = yearMessages.filter(m => m.isSelf)
  const otherMessages = yearMessages.filter(m => !m.isSelf)

  const activeDays = new Set<string>()
  const dailyCounts = new Map<string, number>()
  const hourlyDist = new Array(24).fill(0)
  const typeCounts = new Map<string, number>()

  for (const m of yearMessages) {
    const dayKey = getDayKey(m.timestamp)
    activeDays.add(dayKey)
    dailyCounts.set(dayKey, (dailyCounts.get(dayKey) || 0) + 1)
    hourlyDist[getHour(m.timestamp)]++
    const type = m.type || 'text'
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
  }

  let mostActiveDay = { date: '', count: 0 }
  for (const [date, count] of dailyCounts) {
    if (count > mostActiveDay.count) {
      mostActiveDay = { date, count }
    }
  }

  const mostActiveHour = hourlyDist.indexOf(Math.max(...hourlyDist))

  const { allWords } = calculateWordFrequency(yearMessages, 20)

  const selfPositive = selfMessages.filter(m => m.emotion === 'positive' || m.emotion === 'affectionate').length
  const selfNegative = selfMessages.filter(m => m.emotion === 'negative' || m.emotion === 'angry' || m.emotion === 'sad').length
  const otherPositive = otherMessages.filter(m => m.emotion === 'positive' || m.emotion === 'affectionate').length
  const otherNegative = otherMessages.filter(m => m.emotion === 'negative' || m.emotion === 'angry' || m.emotion === 'sad').length

  const sortedDays = [...activeDays].sort()
  let longestStreak = 1
  let currentStreak = 1
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1])
    const curr = new Date(sortedDays[i])
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000))
    if (diffDays === 1) {
      currentStreak++
      if (currentStreak > longestStreak) longestStreak = currentStreak
    } else {
      currentStreak = 1
    }
  }

  const yearStart = new Date(targetYear, 0, 1)
  const yearEnd = new Date(targetYear, 11, 31)
  const totalDays = Math.round((yearEnd.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000)) + 1

  const mediaBreakdown: { type: string; count: number }[] = []
  for (const [type, count] of typeCounts) {
    mediaBreakdown.push({ type, count })
  }
  mediaBreakdown.sort((a, b) => b.count - a.count)

  return {
    year: targetYear,
    totalMessages: yearMessages.length,
    selfMessages: selfMessages.length,
    otherMessages: otherMessages.length,
    totalDays,
    activeDays: activeDays.size,
    mostActiveDay,
    mostActiveHour,
    topWords: allWords.slice(0, 20).map(w => ({ word: w.word, count: w.count })),
    emotionSummary: {
      selfPositive,
      selfNegative,
      otherPositive,
      otherNegative,
    },
    longestStreak,
    avgDailyMessages: activeDays.size > 0 ? yearMessages.length / activeDays.size : 0,
    mediaBreakdown,
  }
}
