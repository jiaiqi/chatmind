import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from './session'
import { calculateStatistics } from '../analyzers/statistics'
import { calculateEmotionTrend } from '../analyzers/emotion'
import { calculateRelationshipScore } from '../analyzers/relationship-score'
import { detectDangerSignals } from '../analyzers/danger-signals'
import { determineRelationshipStage } from '../analyzers/relationship-stage'
import { analyzeTopics } from '../analyzers/topic-analyzer'
import { analyzeEngagementRhythm } from '../analyzers/engagement-rhythm'
import { analyzeMedia } from '../analyzers/media-analysis'
import { analyzeGroupDynamics } from '../analyzers/group-dynamics'
import { generateAnnualReport } from '../analyzers/annual-report'
import type { StatisticsResult, EmotionTrendPoint, DangerSignal, TopicAnalysisResult, EngagementRhythmResult, MediaAnalysisResult, GroupDynamicsResult, AnnualReportData } from '../types/analysis'
import type { RelationshipScore } from '../analyzers/relationship-score'
import type { DbMessage } from '../db/schema'

type StageResult = ReturnType<typeof determineRelationshipStage>

export interface TimeRangeFilter {
  type: 'all' | '7d' | '30d' | '90d' | 'custom'
  customStart?: number
  customEnd?: number
}

export const useAnalysisStore = defineStore('analysis', () => {
  const sessionStore = useSessionStore()

  const allMessages = ref<DbMessage[]>([])
  const messages = ref<DbMessage[]>([])
  const stats = ref<StatisticsResult | null>(null)
  const emotionTrend = ref<EmotionTrendPoint[]>([])
  const score = ref<RelationshipScore | null>(null)
  const dangerSignals = ref<DangerSignal[]>([])
  const stage = ref<StageResult | null>(null)
  const topicAnalysis = ref<TopicAnalysisResult | null>(null)
  const engagementRhythm = ref<EngagementRhythmResult | null>(null)
  const mediaAnalysis = ref<MediaAnalysisResult | null>(null)
  const groupDynamics = ref<GroupDynamicsResult | null>(null)
  const annualReport = ref<AnnualReportData | null>(null)
  const isLoading = ref(false)
  const cachedSessionId = ref<string | null>(null)
  const timeRangeFilter = ref<TimeRangeFilter>({ type: 'all' })

  const hasData = computed(() => cachedSessionId.value !== null && messages.value.length > 0)

  function getFilterRange(): [number, number] {
    const filter = timeRangeFilter.value
    if (filter.type === 'all') return [0, Date.now()]
    const now = Date.now()
    const days = filter.type === '7d' ? 7 : filter.type === '30d' ? 30 : 90
    if (filter.type === 'custom' && filter.customStart !== undefined && filter.customEnd !== undefined) {
      return [filter.customStart, filter.customEnd]
    }
    return [now - days * 24 * 60 * 60 * 1000, now]
  }

  function recompute(msgs: DbMessage[]) {
    messages.value = msgs
    stats.value = calculateStatistics(msgs)
    emotionTrend.value = calculateEmotionTrend(msgs, 'day')
    score.value = calculateRelationshipScore(msgs, stats.value)
    dangerSignals.value = detectDangerSignals(msgs)
    stage.value = determineRelationshipStage(msgs, stats.value)
    topicAnalysis.value = analyzeTopics(msgs)
    engagementRhythm.value = analyzeEngagementRhythm(msgs)
    mediaAnalysis.value = analyzeMedia(msgs)
    groupDynamics.value = analyzeGroupDynamics(msgs)
    annualReport.value = generateAnnualReport(msgs)
  }

  async function ensureAnalysis(sessionId?: string) {
    const sid = sessionId || sessionStore.currentSessionId
    if (!sid) return

    if (cachedSessionId.value === sid && allMessages.value.length > 0) {
      applyTimeRange()
      return
    }

    isLoading.value = true
    try {
      allMessages.value = await sessionStore.getMessagesByTimeRange(sid, 0, Date.now())
      cachedSessionId.value = sid
      applyTimeRange()
    } finally {
      isLoading.value = false
    }
  }

  function applyTimeRange() {
    const [start, end] = getFilterRange()
    if (timeRangeFilter.value.type === 'all') {
      recompute(allMessages.value)
    } else {
      const filtered = allMessages.value.filter(m => m.timestamp >= start && m.timestamp <= end)
      recompute(filtered)
    }
  }

  function setTimeRange(filter: TimeRangeFilter) {
    timeRangeFilter.value = filter
    if (allMessages.value.length > 0) {
      applyTimeRange()
    }
  }

  function invalidate() {
    cachedSessionId.value = null
    allMessages.value = []
    stats.value = null
    emotionTrend.value = []
    score.value = null
    dangerSignals.value = []
    stage.value = null
    topicAnalysis.value = null
    engagementRhythm.value = null
    mediaAnalysis.value = null
    groupDynamics.value = null
    annualReport.value = null
    messages.value = []
    timeRangeFilter.value = { type: 'all' }
  }

  return {
    allMessages,
    messages,
    stats,
    emotionTrend,
    score,
    dangerSignals,
    stage,
    topicAnalysis,
    engagementRhythm,
    mediaAnalysis,
    groupDynamics,
    annualReport,
    isLoading,
    hasData,
    cachedSessionId,
    timeRangeFilter,
    ensureAnalysis,
    invalidate,
    setTimeRange,
    applyTimeRange,
  }
})
