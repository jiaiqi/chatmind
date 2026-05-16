import type { DbMessage } from '../db/schema'

export interface HourlyShift {
  hour: number
  beforeCount: number
  afterCount: number
  change: number
  changeRatio: number
}

export interface TimeShiftResult {
  hourlyShifts: HourlyShift[]
  peakHourBefore: number
  peakHourAfter: number
  mostDeclinedHour: HourlyShift | null
  mostIncreasedHour: HourlyShift | null
  totalBefore: number
  totalAfter: number
  overallChangeRatio: number
}

export function calculateTimeShift(messages: DbMessage[]): TimeShiftResult {
  if (messages.length < 20) {
    return createEmptyResult()
  }

  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  const midIndex = Math.floor(sorted.length / 2)
  const beforeMessages = sorted.slice(0, midIndex)
  const afterMessages = sorted.slice(midIndex)

  const beforeDistribution = calculateHourlyDistribution(beforeMessages)
  const afterDistribution = calculateHourlyDistribution(afterMessages)

  const hourlyShifts: HourlyShift[] = []
  let mostDeclined: HourlyShift | null = null
  let mostIncreased: HourlyShift | null = null

  for (let hour = 0; hour < 24; hour++) {
    const beforeCount = beforeDistribution[hour]
    const afterCount = afterDistribution[hour]
    const change = afterCount - beforeCount
    const changeRatio = beforeCount > 0 ? change / beforeCount : (afterCount > 0 ? 1 : 0)

    const shift: HourlyShift = { hour, beforeCount, afterCount, change, changeRatio }
    hourlyShifts.push(shift)

    if (!mostDeclined || change < mostDeclined.change) {
      mostDeclined = shift
    }
    if (!mostIncreased || change > mostIncreased.change) {
      mostIncreased = shift
    }
  }

  const totalBefore = beforeMessages.length
  const totalAfter = afterMessages.length

  return {
    hourlyShifts,
    peakHourBefore: beforeDistribution.indexOf(Math.max(...beforeDistribution)),
    peakHourAfter: afterDistribution.indexOf(Math.max(...afterDistribution)),
    mostDeclinedHour: mostDeclined && mostDeclined.change < 0 ? mostDeclined : null,
    mostIncreasedHour: mostIncreased && mostIncreased.change > 0 ? mostIncreased : null,
    totalBefore,
    totalAfter,
    overallChangeRatio: totalBefore > 0 ? (totalAfter - totalBefore) / totalBefore : 0,
  }
}

function calculateHourlyDistribution(messages: DbMessage[]): number[] {
  const distribution = new Array(24).fill(0)
  for (const msg of messages) {
    const hour = new Date(msg.timestamp).getHours()
    distribution[hour]++
  }
  return distribution
}

function createEmptyResult(): TimeShiftResult {
  return {
    hourlyShifts: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      beforeCount: 0,
      afterCount: 0,
      change: 0,
      changeRatio: 0,
    })),
    peakHourBefore: 0,
    peakHourAfter: 0,
    mostDeclinedHour: null,
    mostIncreasedHour: null,
    totalBefore: 0,
    totalAfter: 0,
    overallChangeRatio: 0,
  }
}
