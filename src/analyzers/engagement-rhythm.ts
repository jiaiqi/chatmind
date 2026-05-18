import type { DbMessage } from '../db/schema'
import type { DayRhythm, EngagementRhythmResult } from '../types/analysis'

const GOOD_MORNING_PATTERNS = /早[安上好]|早安|早上好|good morning|gm/i
const GOOD_NIGHT_PATTERNS = /晚安|好梦|睡了|困了|good night|gn/i

export function analyzeEngagementRhythm(messages: DbMessage[]): EngagementRhythmResult {
  if (messages.length === 0) {
    return {
      dailyRhythm: [],
      selfGoodMorningCount: 0,
      otherGoodMorningCount: 0,
      selfGoodNightCount: 0,
      otherGoodNightCount: 0,
      selfFirstMessageDays: 0,
      otherFirstMessageDays: 0,
      selfLastMessageDays: 0,
      otherLastMessageDays: 0,
    }
  }

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  const dayMap = new Map<string, DbMessage[]>()

  for (const m of sorted) {
    const d = new Date(m.timestamp)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const arr = dayMap.get(key) || []
    arr.push(m)
    dayMap.set(key, arr)
  }

  const dailyRhythm: DayRhythm[] = []
  let selfGoodMorningCount = 0
  let otherGoodMorningCount = 0
  let selfGoodNightCount = 0
  let otherGoodNightCount = 0
  let selfFirstMessageDays = 0
  let otherFirstMessageDays = 0
  let selfLastMessageDays = 0
  let otherLastMessageDays = 0

  for (const [date, msgs] of dayMap) {
    const selfMsgs = msgs.filter(m => m.isSelf)
    const otherMsgs = msgs.filter(m => !m.isSelf)

    const selfFirst = selfMsgs.length > 0 ? selfMsgs[0] : null
    const selfLast = selfMsgs.length > 0 ? selfMsgs[selfMsgs.length - 1] : null
    const otherFirst = otherMsgs.length > 0 ? otherMsgs[0] : null
    const otherLast = otherMsgs.length > 0 ? otherMsgs[otherMsgs.length - 1] : null

    const selfSaidGoodMorning = selfMsgs.some(m => GOOD_MORNING_PATTERNS.test(m.content))
    const selfSaidGoodNight = selfMsgs.some(m => GOOD_NIGHT_PATTERNS.test(m.content))
    const otherSaidGoodMorning = otherMsgs.some(m => GOOD_MORNING_PATTERNS.test(m.content))
    const otherSaidGoodNight = otherMsgs.some(m => GOOD_NIGHT_PATTERNS.test(m.content))

    if (selfSaidGoodMorning) selfGoodMorningCount++
    if (otherSaidGoodMorning) otherGoodMorningCount++
    if (selfSaidGoodNight) selfGoodNightCount++
    if (otherSaidGoodNight) otherGoodNightCount++

    const firstMsg = msgs[0]
    const lastMsg = msgs[msgs.length - 1]

    if (firstMsg.isSelf) {
      selfFirstMessageDays++
    } else {
      otherFirstMessageDays++
    }

    if (lastMsg.isSelf) {
      selfLastMessageDays++
    } else {
      otherLastMessageDays++
    }

    dailyRhythm.push({
      date,
      selfFirstTime: selfFirst ? formatTime(selfFirst.timestamp) : null,
      selfLastTime: selfLast ? formatTime(selfLast.timestamp) : null,
      otherFirstTime: otherFirst ? formatTime(otherFirst.timestamp) : null,
      otherLastTime: otherLast ? formatTime(otherLast.timestamp) : null,
      selfSaidGoodMorning,
      selfSaidGoodNight,
      otherSaidGoodMorning,
      otherSaidGoodNight,
    })
  }

  return {
    dailyRhythm,
    selfGoodMorningCount,
    otherGoodMorningCount,
    selfGoodNightCount,
    otherGoodNightCount,
    selfFirstMessageDays,
    otherFirstMessageDays,
    selfLastMessageDays,
    otherLastMessageDays,
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
