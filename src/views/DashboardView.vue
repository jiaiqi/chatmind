<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  NCard, NGrid, NGridItem, NStatistic, NDivider,
  NButton, NEmpty, NProgress, NAlert, NSpace, NTag, useMessage,
} from 'naive-ui'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent, ToolboxComponent,
} from 'echarts/components'
import { useSessionStore } from '../stores/session'
import { useThemeStore } from '../stores/theme'
import { buildChartOption } from '../utils/chart-theme'
import { calculateStatistics, formatDuration } from '../analyzers/statistics'
import { calculateEmotionTrend } from '../analyzers/emotion'
import { calculateRelationshipScore } from '../analyzers/relationship-score'
import { detectDangerSignals } from '../analyzers/danger-signals'
import { formatDate } from '../utils/date'
import type { StatisticsResult } from '../types/analysis'
import type { DbMessage } from '../db/schema'
import type { RelationshipScore } from '../analyzers/relationship-score'
import type { DangerSignal } from '../types/analysis'

use([
  CanvasRenderer,
  LineChart, BarChart, PieChart,
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent, ToolboxComponent,
])

const sessionStore = useSessionStore()
const themeStore = useThemeStore()
const message = useMessage()

const messages = ref<DbMessage[]>([])
const stats = ref<StatisticsResult | null>(null)
const emotionTrend = ref<any[]>([])
const score = ref<RelationshipScore | null>(null)
const dangerSignals = ref<DangerSignal[]>([])
const isLoading = ref(false)

const hasData = computed(() => sessionStore.currentSession !== null)

const sessionName = computed(() => {
  return sessionStore.currentSession?.name || '未命名会话'
})

const timeRangeText = computed(() => {
  const session = sessionStore.currentSession
  if (!session) return ''
  const [start, end] = session.timeRange
  return `${formatDate(start)} 至 ${formatDate(end)}`
})

async function loadData() {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId) return

  isLoading.value = true
  try {
    messages.value = await sessionStore.getMessagesByTimeRange(sessionId, 0, Date.now())
    stats.value = calculateStatistics(messages.value)
    emotionTrend.value = calculateEmotionTrend(messages.value, 'day')
    score.value = calculateRelationshipScore(messages.value, stats.value)
    dangerSignals.value = detectDangerSignals(messages.value)
  } catch (err) {
    message.error('加载数据失败')
  } finally {
    isLoading.value = false
  }
}

watch(() => sessionStore.currentSessionId, loadData)
onMounted(loadData)

const emotionChartOption = computed(() => {
  if (!emotionTrend.value.length) return {}

  return buildChartOption(themeStore.isDark, {
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['我-正面', '我-负面', '对方-正面', '对方-负面'],
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: emotionTrend.value.map(d => d.date),
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '我-正面',
        type: 'line',
        smooth: true,
        data: emotionTrend.value.map(d => d.selfPositive),
        itemStyle: { color: '#18a058' },
        areaStyle: { opacity: 0.1 },
      },
      {
        name: '我-负面',
        type: 'line',
        smooth: true,
        data: emotionTrend.value.map(d => d.selfNegative),
        itemStyle: { color: '#d03050' },
        areaStyle: { opacity: 0.1 },
      },
      {
        name: '对方-正面',
        type: 'line',
        smooth: true,
        data: emotionTrend.value.map(d => d.otherPositive),
        itemStyle: { color: '#2080f0' },
        lineStyle: { type: 'dashed' },
      },
      {
        name: '对方-负面',
        type: 'line',
        smooth: true,
        data: emotionTrend.value.map(d => d.otherNegative),
        itemStyle: { color: '#f0a020' },
        lineStyle: { type: 'dashed' },
      },
    ],
  })
})

const hourlyChartOption = computed(() => {
  if (!stats.value) return {}
  return buildChartOption(themeStore.isDark, {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 24 }, (_, i) => `${i}时`),
    },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: stats.value.hourlyDistribution,
      itemStyle: { color: '#18a058' },
    }],
  })
})

const healthScoreClass = computed(() => {
  if (!score.value) return ''
  const s = score.value.total
  return s >= 80 ? 'health-good' : s >= 60 ? 'health-normal' : s >= 40 ? 'health-warning' : 'health-bad'
})

const healthColor = computed(() => {
  if (!score.value) return '#18a058'
  const s = score.value.total
  return s >= 80 ? '#18a058' : s >= 60 ? '#2080f0' : s >= 40 ? '#f0a020' : '#d03050'
})

const ratioChartOption = computed(() => {
  if (!stats.value) return {}
  return buildChartOption(themeStore.isDark, {
    tooltip: { trigger: 'item' },
    legend: { top: '5%', left: 'center' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: true, formatter: '{b}: {c} ({d}%)' },
      data: [
        { value: stats.value.selfMessages, name: '我', itemStyle: { color: '#18a058' } },
        { value: stats.value.otherMessages, name: '对方', itemStyle: { color: '#2080f0' } },
      ],
    }],
  })
})
</script>

<template>
  <div class="dashboard-view">
    <template v-if="hasData">
      <div class="dashboard-header">
        <h2>{{ sessionName }}</h2>
        <p class="time-range">{{ timeRangeText }}</p>
      </div>

      <n-grid :cols="4" :x-gap="16" :y-gap="16" class="stats-grid">
        <n-grid-item>
          <n-card>
            <n-statistic label="消息总数" :value="stats?.totalMessages || 0" />
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <n-statistic label="我的消息" :value="stats?.selfMessages || 0" />
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <n-statistic label="对方消息" :value="stats?.otherMessages || 0" />
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <n-statistic label="平均回复" :value="formatDuration(stats?.avgReplyDelay || 0)" />
          </n-card>
        </n-grid-item>
      </n-grid>

      <!-- 关系健康度 -->
      <n-card v-if="score" class="health-card">
        <div class="health-header">
          <span class="health-label">关系健康度</span>
          <span class="health-score" :class="healthScoreClass">{{ score.total }}分</span>
        </div>
        <n-progress
          type="line"
          :percentage="score.total"
          :color="healthColor"
          :height="12"
          :show-indicator="false"
        />
        <p class="health-desc">{{ score.interpretation }}</p>
        <n-space v-if="score.total > 0" size="small" style="margin-top: 8px">
          <n-tag size="small" :type="score.breakdown.balance >= 60 ? 'success' : 'warning'"
            >平衡 {{ score.breakdown.balance }}</n-tag
          >
          <n-tag size="small" :type="score.breakdown.positivity >= 60 ? 'success' : 'warning'"
            >正向 {{ score.breakdown.positivity }}</n-tag
          >
          <n-tag size="small" :type="score.breakdown.responsiveness >= 60 ? 'success' : 'warning'"
            >及时 {{ score.breakdown.responsiveness }}</n-tag
          >
          <n-tag size="small" :type="score.breakdown.consistency >= 60 ? 'success' : 'warning'"
            >稳定 {{ score.breakdown.consistency }}</n-tag
          >
          <n-tag size="small" :type="score.breakdown.depth >= 60 ? 'success' : 'warning'"
            >深度 {{ score.breakdown.depth }}</n-tag
          >
        </n-space>
      </n-card>

      <!-- 危险信号 -->
      <n-card v-if="dangerSignals.length > 0" title="⚠️ 关系预警信号" class="danger-card">
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
      </n-card>

      <n-divider />

      <n-card title="情绪趋势" class="chart-card">
        <v-chart class="chart" :option="emotionChartOption" autoresize />
      </n-card>

      <n-grid :cols="2" :x-gap="16" class="bottom-charts">
        <n-grid-item>
          <n-card title="活跃时段分布" class="chart-card">
            <v-chart class="chart" :option="hourlyChartOption" autoresize />
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card title="消息比例" class="chart-card">
            <v-chart class="chart" :option="ratioChartOption" autoresize />
          </n-card>
        </n-grid-item>
      </n-grid>
    </template>

    <template v-else>
      <n-empty description="暂无数据，请先导入聊天记录">
        <template #extra>
          <n-button type="primary" @click="$emit('switchView', 'import')">
            去导入
          </n-button>
        </template>
      </n-empty>
    </template>
  </div>
</template>

<style scoped>
.dashboard-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 24px;
}

.dashboard-header h2 {
  margin: 0;
  font-size: 24px;
  color: var(--text-color);
}

.time-range {
  color: var(--text-secondary);
  margin: 4px 0 0;
}

.stats-grid {
  margin-bottom: 24px;
}

.chart-card {
  margin-bottom: 16px;
}

.chart {
  height: 300px;
}

.bottom-charts {
  margin-top: 16px;
}

.health-card {
  margin-bottom: 16px;
}

.health-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.health-label {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color);
}

.health-score {
  font-size: 24px;
  font-weight: 700;
}

.health-good { color: #18a058; }
.health-normal { color: #2080f0; }
.health-warning { color: #f0a020; }
.health-bad { color: #d03050; }

.health-desc {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.danger-card {
  margin-bottom: 16px;
}
</style>
