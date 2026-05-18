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

export interface TopicInfo {
  id: number
  startTime: number
  endTime: number
  initiator: 'self' | 'other'
  messageCount: number
  startContent: string
}

export interface TopicAnalysisResult {
  topics: TopicInfo[]
  selfInitiated: number
  otherInitiated: number
  selfInitiatedRatio: number
  avgTopicLength: number
  topicSwitchCount: number
}

export interface DayRhythm {
  date: string
  selfFirstTime: string | null
  selfLastTime: string | null
  otherFirstTime: string | null
  otherLastTime: string | null
  selfSaidGoodMorning: boolean
  selfSaidGoodNight: boolean
  otherSaidGoodMorning: boolean
  otherSaidGoodNight: boolean
}

export interface EngagementRhythmResult {
  dailyRhythm: DayRhythm[]
  selfGoodMorningCount: number
  otherGoodMorningCount: number
  selfGoodNightCount: number
  otherGoodNightCount: number
  selfFirstMessageDays: number
  otherFirstMessageDays: number
  selfLastMessageDays: number
  otherLastMessageDays: number
}

export interface MediaTypeStat {
  type: string
  label: string
  selfCount: number
  otherCount: number
  totalCount: number
}

export interface MediaAnalysisResult {
  typeStats: MediaTypeStat[]
  selfMediaRatio: number
  otherMediaRatio: number
  totalMediaCount: number
  totalTextCount: number
}

export interface ParticipantStat {
  senderId: string
  name: string
  messageCount: number
  totalWords: number
  avgWordsPerMessage: number
  activeDays: number
  firstSeen: number
  lastSeen: number
}

export interface GroupDynamicsResult {
  participantStats: ParticipantStat[]
  totalParticipants: number
  topSender: ParticipantStat | null
  activityDistribution: { date: string; counts: Record<string, number> }[]
}

export interface AnnualReportData {
  year: number
  totalMessages: number
  selfMessages: number
  otherMessages: number
  totalDays: number
  activeDays: number
  mostActiveDay: { date: string; count: number }
  mostActiveHour: number
  topWords: { word: string; count: number }[]
  emotionSummary: {
    selfPositive: number
    selfNegative: number
    otherPositive: number
    otherNegative: number
  }
  longestStreak: number
  avgDailyMessages: number
  mediaBreakdown: { type: string; count: number }[]
}
