export interface StatisticsResult {
  totalMessages: number
  selfMessages: number
  otherMessages: number
  selfRatio: number
  hourlyDistribution: number[]
  dailyDistribution: Map<string, number>
  avgLength: { self: number; other: number }
  maxLength: { self: number; other: number }
  replyDelays: number[]
  avgReplyDelay: number
  avgSelfReplyDelay: number
  avgOtherReplyDelay: number
}

export interface EmotionResult {
  label: import('./message').EmotionLabel
  score: number
  method: 'rule' | 'ai' | 'fallback'
}

export interface EmotionTrendPoint {
  date: string
  selfPositive: number
  selfNegative: number
  selfNeutral: number
  otherPositive: number
  otherNegative: number
  otherNeutral: number
}

export interface DangerSignal {
  signal: string
  severity: 'low' | 'medium' | 'high'
  evidence: string
}
