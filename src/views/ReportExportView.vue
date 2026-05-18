<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  NCard, NButton, NSpace, NRadioGroup, NRadio,
  NSwitch, NDatePicker, NEmpty, NTag, NProgress,
  NAlert, NDivider, useMessage,
} from 'naive-ui'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent,
} from 'echarts/components'
import { useSessionStore } from '../stores/session'
import { useAnalysisStore } from '../stores/analysis'
import { useThemeStore } from '../stores/theme'
import { buildChartOption } from '../utils/chart-theme'
import { formatDuration } from '../analyzers/statistics'
import { calculateStatistics } from '../analyzers/statistics'
import { calculateEmotionTrend } from '../analyzers/emotion'
import { calculateRelationshipScore } from '../analyzers/relationship-score'
import { detectDangerSignals } from '../analyzers/danger-signals'
import { exportToImage, exportToPDF } from '../utils/export'
import { formatDate } from '../utils/date'
import type { DbMessage } from '../db/schema'

use([
  CanvasRenderer,
  LineChart,
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent,
])

const sessionStore = useSessionStore()
const analysisStore = useAnalysisStore()
const themeStore = useThemeStore()
const message = useMessage()

const reportType = ref('full')
const timeRange = ref('all')
const customRange = ref<[number, number] | null>(null)
const sanitizeEnabled = ref(true)
const showPreview = ref(false)
const exporting = ref(false)

const messages = ref<DbMessage[]>([])
const isLoading = ref(false)

const hasData = computed(() => sessionStore.currentSession !== null)
const sessionName = computed(() => sessionStore.currentSession?.name || '未命名会话')

function getTimeRange(): [number, number] {
  if (timeRange.value === 'custom' && customRange.value) {
    return customRange.value
  }
  const now = Date.now()
  const days = timeRange.value === '30d' ? 30 : timeRange.value === '90d' ? 90 : 365
  return [now - days * 24 * 60 * 60 * 1000, now]
}

async function loadData() {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId) return

  isLoading.value = true
  try {
    await analysisStore.ensureAnalysis(sessionId)
    const [start, end] = getTimeRange()
    const allMsgs = analysisStore.messages
    if (timeRange.value === 'all') {
      messages.value = allMsgs
    } else {
      messages.value = allMsgs.filter(m => m.timestamp >= start && m.timestamp <= end)
    }
  } catch {
    message.error('加载数据失败')
  } finally {
    isLoading.value = false
  }
}

watch(() => sessionStore.currentSessionId, loadData)
watch(timeRange, () => { if (showPreview.value) loadData() })
onMounted(loadData)

const stats = computed(() => {
  if (!messages.value.length) return null
  return calculateStatistics(messages.value)
})

const emotionTrend = computed(() => {
  if (!messages.value.length) return []
  return calculateEmotionTrend(messages.value, 'day')
})

const score = computed(() => {
  if (!stats.value) return null
  return calculateRelationshipScore(messages.value, stats.value)
})

const dangerSignals = computed(() => {
  if (!messages.value.length) return []
  return detectDangerSignals(messages.value)
})

const emotionChartOption = computed(() => {
  if (!emotionTrend.value.length) return {}
  return buildChartOption(themeStore.isDark, {
    tooltip: { trigger: 'axis' },
    legend: { data: ['我-正面', '我-负面', '对方-正面', '对方-负面'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: emotionTrend.value.map(d => d.date) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: '我-正面', type: 'line', smooth: true, data: emotionTrend.value.map(d => d.selfPositive), itemStyle: { color: '#18a058' } },
      { name: '我-负面', type: 'line', smooth: true, data: emotionTrend.value.map(d => d.selfNegative), itemStyle: { color: '#d03050' } },
      { name: '对方-正面', type: 'line', smooth: true, data: emotionTrend.value.map(d => d.otherPositive), itemStyle: { color: '#2080f0' }, lineStyle: { type: 'dashed' } },
      { name: '对方-负面', type: 'line', smooth: true, data: emotionTrend.value.map(d => d.otherNegative), itemStyle: { color: '#f0a020' }, lineStyle: { type: 'dashed' } },
    ],
  })
})

function handleGenerate() {
  loadData().then(() => {
    showPreview.value = true
  })
}

async function handleExportImage() {
  const el = document.getElementById('report-content')
  if (!el) return
  exporting.value = true
  try {
    await exportToImage(el, `ChatMind报告-${sessionName.value}-${formatDate(Date.now())}`)
    message.success('图片导出成功')
  } catch (err: any) {
    message.error(`导出失败: ${err.message}`)
  } finally {
    exporting.value = false
  }
}

async function handleExportPDF() {
  const el = document.getElementById('report-content')
  if (!el) return
  exporting.value = true
  try {
    await exportToPDF(el, `ChatMind报告-${sessionName.value}-${formatDate(Date.now())}`)
    message.success('PDF 导出成功')
  } catch (err: any) {
    message.error(`导出失败: ${err.message}`)
  } finally {
    exporting.value = false
  }
}

const healthColor = computed(() => {
  if (!score.value) return '#18a058'
  const s = score.value.total
  return s >= 80 ? '#18a058' : s >= 60 ? '#2080f0' : s >= 40 ? '#f0a020' : '#d03050'
})
</script>

<template>
  <div class="report-export-view">
    <template v-if="hasData">
      <n-card title="导出配置" class="config-card">
        <n-space vertical>
          <div class="config-row">
            <span class="config-label">报告类型</span>
            <n-radio-group v-model:value="reportType">
              <n-radio value="brief">简要概览</n-radio>
              <n-radio value="full">完整分析</n-radio>
            </n-radio-group>
          </div>

          <div class="config-row">
            <span class="config-label">时间范围</span>
            <n-radio-group v-model:value="timeRange">
              <n-radio value="all">全部历史</n-radio>
              <n-radio value="30d">近 30 天</n-radio>
              <n-radio value="90d">近 90 天</n-radio>
              <n-radio value="custom">自定义</n-radio>
            </n-radio-group>
          </div>

          <div v-if="timeRange === 'custom'" class="config-row">
            <span class="config-label"></span>
            <n-date-picker v-model:value="customRange" type="daterange" clearable />
          </div>

          <div class="config-row">
            <span class="config-label">隐私设置</span>
            <n-space>
              <n-switch v-model:value="sanitizeEnabled" />
              <span class="config-desc">导出时脱敏处理（替换昵称、去除敏感信息）</span>
            </n-space>
          </div>

          <n-space>
            <n-button type="primary" @click="handleGenerate">
              {{ showPreview ? '重新生成' : '生成报告预览' }}
            </n-button>
          </n-space>
        </n-space>
      </n-card>

      <template v-if="showPreview && stats">
        <n-space style="margin: 16px 0; justify-content: center">
          <n-button :loading="exporting" @click="handleExportImage">
            导出为图片
          </n-button>
          <n-button :loading="exporting" type="primary" @click="handleExportPDF">
            导出为 PDF
          </n-button>
        </n-space>

        <div id="report-content" class="report-content">
          <div class="report-header">
            <h1>ChatMind 关系分析报告</h1>
            <p class="report-meta">
              分析对象: {{ sessionName }} | 时间范围: {{ formatDate(messages[0]?.timestamp || 0) }} 至 {{ formatDate(messages[messages.length - 1]?.timestamp || 0) }}
            </p>
            <p class="report-meta">生成时间: {{ new Date().toLocaleString('zh-CN') }}</p>
          </div>

          <div class="report-section">
            <h2>一、数据概览</h2>
            <div class="overview-grid">
              <div class="overview-item">
                <div class="overview-value">{{ stats.totalMessages }}</div>
                <div class="overview-label">消息总数</div>
              </div>
              <div class="overview-item">
                <div class="overview-value">{{ stats.selfMessages }}</div>
                <div class="overview-label">我的消息</div>
              </div>
              <div class="overview-item">
                <div class="overview-value">{{ stats.otherMessages }}</div>
                <div class="overview-label">对方消息</div>
              </div>
              <div class="overview-item">
                <div class="overview-value">{{ formatDuration(stats.avgReplyDelay) }}</div>
                <div class="overview-label">平均回复</div>
              </div>
            </div>
          </div>

          <div v-if="score && score.total > 0" class="report-section">
            <h2>二、关系健康度</h2>
            <div class="health-section">
              <div class="health-score-large" :style="{ color: healthColor }">
                {{ score.total }}
                <span class="health-unit">分</span>
              </div>
              <n-progress
                type="line"
                :percentage="score.total"
                :color="healthColor"
                :height="16"
                :show-indicator="false"
                style="margin: 12px 0"
              />
              <p class="health-interpretation">{{ score.interpretation }}</p>
              <n-space size="small" style="margin-top: 12px">
                <n-tag size="small">平衡 {{ score.breakdown.balance }}</n-tag>
                <n-tag size="small">正向 {{ score.breakdown.positivity }}</n-tag>
                <n-tag size="small">及时 {{ score.breakdown.responsiveness }}</n-tag>
                <n-tag size="small">稳定 {{ score.breakdown.consistency }}</n-tag>
                <n-tag size="small">深度 {{ score.breakdown.depth }}</n-tag>
              </n-space>
            </div>
          </div>

          <div v-if="dangerSignals.length > 0" class="report-section">
            <h2>三、关系预警信号</h2>
            <n-space vertical>
              <n-alert
                v-for="(signal, i) in dangerSignals"
                :key="i"
                :type="signal.severity === 'high' ? 'error' : 'warning'"
                :title="signal.signal"
              >
                {{ signal.evidence }}
              </n-alert>
            </n-space>
          </div>

          <div v-if="reportType === 'full' && emotionTrend.length > 0" class="report-section">
            <h2>四、情绪趋势</h2>
            <v-chart class="report-chart" :option="emotionChartOption" autoresize />
          </div>

          <div class="report-disclaimer">
            <n-divider />
            <p>本报告由 AI 辅助生成，仅供娱乐和自我反思参考，不构成专业心理咨询建议。</p>
            <p>所有数据均在本地处理，未上传至任何云端服务器。</p>
          </div>
        </div>

        <n-space style="margin: 16px 0; justify-content: center">
          <n-button :loading="exporting" @click="handleExportImage">
            导出为图片
          </n-button>
          <n-button :loading="exporting" type="primary" @click="handleExportPDF">
            导出为 PDF
          </n-button>
        </n-space>
      </template>
    </template>

    <n-empty v-else description="暂无数据，请先导入聊天记录">
      <template #extra>
        <n-button type="primary" @click="$emit('switchView', 'import')">
          去导入
        </n-button>
      </template>
    </n-empty>
  </div>
</template>

<style scoped>
.report-export-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.config-card {
  margin-bottom: 16px;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 32px;
}

.config-label {
  width: 80px;
  flex-shrink: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.config-desc {
  color: var(--text-muted);
  font-size: 13px;
}

.report-content {
  background: var(--card-bg);
  border-radius: 8px;
  padding: 40px;
  max-width: 800px;
  margin: 0 auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.report-header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid var(--border-color);
}

.report-header h1 {
  margin: 0 0 12px;
  font-size: 28px;
  color: var(--text-color);
}

.report-meta {
  margin: 4px 0;
  color: var(--text-muted);
  font-size: 13px;
}

.report-section {
  margin-bottom: 32px;
}

.report-section h2 {
  font-size: 18px;
  color: var(--text-color);
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.overview-item {
  text-align: center;
  padding: 16px;
  background: var(--app-bg);
  border-radius: 8px;
}

.overview-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-color);
}

.overview-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.health-section {
  text-align: center;
  padding: 24px;
  background: var(--app-bg);
  border-radius: 8px;
}

.health-score-large {
  font-size: 48px;
  font-weight: 700;
}

.health-unit {
  font-size: 20px;
  font-weight: 500;
}

.health-interpretation {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 8px 0 0;
}

.report-chart {
  height: 300px;
}

.report-disclaimer {
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  margin-top: 24px;
}

.report-disclaimer p {
  margin: 4px 0;
}
</style>
