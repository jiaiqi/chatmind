<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  NCard, NGrid, NGridItem, NStatistic, NDivider,
  NButton, NEmpty, useMessage,
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
import { formatDate } from '../utils/date'
import type { StatisticsResult } from '../types/analysis'
import type { DbMessage } from '../db/schema'

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
</style>
