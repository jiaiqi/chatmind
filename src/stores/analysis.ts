import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useSessionStore } from './session'
import { calculateStatistics } from '../analyzers/statistics'
import { calculateEmotionTrend } from '../analyzers/emotion'
import { calculateRelationshipScore } from '../analyzers/relationship-score'
import { detectDangerSignals } from '../analyzers/danger-signals'
import { determineRelationshipStage } from '../analyzers/relationship-stage'
import type { StatisticsResult, EmotionTrendPoint, DangerSignal } from '../types/analysis'
import type { RelationshipScore } from '../analyzers/relationship-score'
import type { DbMessage } from '../db/schema'

type StageResult = ReturnType<typeof determineRelationshipStage>

export const useAnalysisStore = defineStore('analysis', () => {
  const sessionStore = useSessionStore()

  const messages = ref<DbMessage[]>([])
  const stats = ref<StatisticsResult | null>(null)
  const emotionTrend = ref<EmotionTrendPoint[]>([])
  const score = ref<RelationshipScore | null>(null)
  const dangerSignals = ref<DangerSignal[]>([])
  const stage = ref<StageResult | null>(null)
  const isLoading = ref(false)
  const cachedSessionId = ref<string | null>(null)

  const hasData = computed(() => cachedSessionId.value !== null && messages.value.length > 0)

  async function ensureAnalysis(sessionId?: string) {
    const sid = sessionId || sessionStore.currentSessionId
    if (!sid) return

    if (cachedSessionId.value === sid && stats.value) return

    isLoading.value = true
    try {
      messages.value = await sessionStore.getMessagesByTimeRange(sid, 0, Date.now())
      stats.value = calculateStatistics(messages.value)
      emotionTrend.value = calculateEmotionTrend(messages.value, 'day')
      score.value = calculateRelationshipScore(messages.value, stats.value)
      dangerSignals.value = detectDangerSignals(messages.value)
      stage.value = determineRelationshipStage(messages.value, stats.value)
      cachedSessionId.value = sid
    } finally {
      isLoading.value = false
    }
  }

  function invalidate() {
    cachedSessionId.value = null
    stats.value = null
    emotionTrend.value = []
    score.value = null
    dangerSignals.value = []
    stage.value = null
    messages.value = []
  }

  return {
    messages,
    stats,
    emotionTrend,
    score,
    dangerSignals,
    stage,
    isLoading,
    hasData,
    cachedSessionId,
    ensureAnalysis,
    invalidate,
  }
})
