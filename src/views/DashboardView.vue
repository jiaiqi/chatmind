<script setup lang="ts">
import { computed, watch, onMounted, ref } from 'vue'
import {
  NCard, NGrid, NGridItem, NStatistic, NDivider,
  NButton, NEmpty, NProgress, NAlert, NSpace, NTag, useMessage,
  NRadioGroup, NRadioButton, NDatePicker,
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
import { useAnalysisStore, type TimeRangeFilter } from '../stores/analysis'
import { useThemeStore } from '../stores/theme'
import { buildChartOption } from '../utils/chart-theme'
import { formatDuration } from '../analyzers/statistics'
import { formatDate } from '../utils/date'

use([
  CanvasRenderer,
  LineChart, BarChart, PieChart,
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent, ToolboxComponent,
])

const sessionStore = useSessionStore()
const analysisStore = useAnalysisStore()
const themeStore = useThemeStore()
const message = useMessage()

const timeRangeType = ref<'all' | '7d' | '30d' | '90d' | 'custom'>('all')
const customRange = ref<[number, number] | null>(null)

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

function handleTimeRangeChange() {
  const filter: TimeRangeFilter = {
    type: timeRangeType.value,
    customStart: customRange.value?.[0],
    customEnd: customRange.value?.[1],
  }
  analysisStore.setTimeRange(filter)
}

async function loadData() {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId) return
  try {
    await analysisStore.ensureAnalysis(sessionId)
  } catch (err) {
    message.error('加载数据失败')
  }
}

watch(() => sessionStore.currentSessionId, loadData)
onMounted(loadData)

const emotionChartOption = computed(() => {
  if (!analysisStore.emotionTrend.length) return {}

  return buildChartOption(themeStore.isDark, {
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['我-正面', '我-负面', '对方-正面', '对方-负面'],
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: analysisStore.emotionTrend.map(d => d.date),
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: '我-正面',
        type: 'line',
        smooth: true,
        data: analysisStore.emotionTrend.map(d => d.selfPositive),
        itemStyle: { color: '#18a058' },
        areaStyle: { opacity: 0.1 },
      },
      {
        name: '我-负面',
        type: 'line',
        smooth: true,
        data: analysisStore.emotionTrend.map(d => d.selfNegative),
        itemStyle: { color: '#d03050' },
        areaStyle: { opacity: 0.1 },
      },
      {
        name: '对方-正面',
        type: 'line',
        smooth: true,
        data: analysisStore.emotionTrend.map(d => d.otherPositive),
        itemStyle: { color: '#2080f0' },
        lineStyle: { type: 'dashed' },
      },
      {
        name: '对方-负面',
        type: 'line',
        smooth: true,
        data: analysisStore.emotionTrend.map(d => d.otherNegative),
        itemStyle: { color: '#f0a020' },
        lineStyle: { type: 'dashed' },
      },
    ],
  })
})

const hourlyChartOption = computed(() => {
  if (!analysisStore.stats) return {}
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
      data: analysisStore.stats.hourlyDistribution,
      itemStyle: { color: '#18a058' },
    }],
  })
})

const healthScoreClass = computed(() => {
  if (!analysisStore.score) return ''
  const s = analysisStore.score.total
  return s >= 80 ? 'health-good' : s >= 60 ? 'health-normal' : s >= 40 ? 'health-warning' : 'health-bad'
})

const healthColor = computed(() => {
  if (!analysisStore.score) return '#18a058'
  const s = analysisStore.score.total
  return s >= 80 ? '#18a058' : s >= 60 ? '#2080f0' : s >= 40 ? '#f0a020' : '#d03050'
})

const stageTagType = computed(() => {
  if (!analysisStore.stage) return 'default'
  const types: Record<string, any> = {
    '蜜月期': 'error',
    '稳定期': 'success',
    '倦怠期': 'warning',
    '危机期': 'error',
    '修复期': 'info',
  }
  return types[analysisStore.stage.stage] || 'default'
})

const ratioChartOption = computed(() => {
  if (!analysisStore.stats) return {}
  return buildChartOption(themeStore.isDark, {
    tooltip: { trigger: 'item' },
    legend: { top: '5%', left: 'center' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: true, formatter: '{b}: {c} ({d}%)' },
      data: [
        { value: analysisStore.stats.selfMessages, name: '我', itemStyle: { color: '#18a058' } },
        { value: analysisStore.stats.otherMessages, name: '对方', itemStyle: { color: '#2080f0' } },
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
        <div class="time-filter">
          <n-radio-group v-model:value="timeRangeType" size="small" @update:value="handleTimeRangeChange">
            <n-radio-button value="all">全部</n-radio-button>
            <n-radio-button value="7d">近7天</n-radio-button>
            <n-radio-button value="30d">近30天</n-radio-button>
            <n-radio-button value="90d">近90天</n-radio-button>
            <n-radio-button value="custom">自定义</n-radio-button>
          </n-radio-group>
          <n-date-picker
            v-if="timeRangeType === 'custom'"
            v-model:value="customRange"
            type="daterange"
            size="small"
            clearable
            @update:value="handleTimeRangeChange"
          />
        </div>
      </div>

      <n-grid :cols="4" :x-gap="16" :y-gap="16" class="stats-grid">
        <n-grid-item>
          <n-card>
            <n-statistic label="消息总数" :value="analysisStore.stats?.totalMessages || 0" />
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <n-statistic label="我的消息" :value="analysisStore.stats?.selfMessages || 0" />
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <n-statistic label="对方消息" :value="analysisStore.stats?.otherMessages || 0" />
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card>
            <n-statistic label="平均回复" :value="formatDuration(analysisStore.stats?.avgReplyDelay || 0)" />
          </n-card>
        </n-grid-item>
      </n-grid>

      <!-- 关系阶段 -->
      <n-card v-if="analysisStore.stage" class="stage-card">
        <div class="stage-header">
          <div class="stage-main">
            <span class="stage-label">当前关系阶段</span>
            <n-tag
              size="large"
              :type="stageTagType"
              style="font-size: 18px; font-weight: 600; padding: 4px 16px"
            >
              {{ analysisStore.stage.stage }}
            </n-tag>
          </div>
          <div class="stage-confidence">
            置信度 {{ (analysisStore.stage.confidence * 100).toFixed(0) }}%
          </div>
        </div>
        <p class="stage-reasoning">{{ analysisStore.stage.reasoning }}</p>
        <n-space v-if="analysisStore.stage.keyIndicators.length" size="small" style="margin-top: 12px"
        >
          <n-tag
            v-for="(ind, i) in analysisStore.stage.keyIndicators"
            :key="i"
            size="small"
            :type="ind.impact === 'positive' ? 'success' : ind.impact === 'negative' ? 'warning' : 'default'"
          >
            {{ ind.indicator }}: {{ ind.value }}
          </n-tag>
        </n-space>
      </n-card>

      <!-- 关系健康度 -->
      <n-card v-if="analysisStore.score" class="health-card">
        <div class="health-header">
          <span class="health-label">关系健康度</span>
          <span class="health-score" :class="healthScoreClass">{{ analysisStore.score.total }}分</span>
        </div>
        <n-progress
          type="line"
          :percentage="analysisStore.score.total"
          :color="healthColor"
          :height="12"
          :show-indicator="false"
        />
        <p class="health-desc">{{ analysisStore.score.interpretation }}</p>
        <n-space v-if="analysisStore.score.total > 0" size="small" style="margin-top: 8px">
          <n-tag size="small" :type="analysisStore.score.breakdown.balance >= 60 ? 'success' : 'warning'"
            >平衡 {{ analysisStore.score.breakdown.balance }}</n-tag
          >
          <n-tag size="small" :type="analysisStore.score.breakdown.positivity >= 60 ? 'success' : 'warning'"
            >正向 {{ analysisStore.score.breakdown.positivity }}</n-tag
          >
          <n-tag size="small" :type="analysisStore.score.breakdown.responsiveness >= 60 ? 'success' : 'warning'"
            >及时 {{ analysisStore.score.breakdown.responsiveness }}</n-tag
          >
          <n-tag size="small" :type="analysisStore.score.breakdown.consistency >= 60 ? 'success' : 'warning'"
            >稳定 {{ analysisStore.score.breakdown.consistency }}</n-tag
          >
          <n-tag size="small" :type="analysisStore.score.breakdown.depth >= 60 ? 'success' : 'warning'"
            >深度 {{ analysisStore.score.breakdown.depth }}</n-tag
          >
        </n-space>
      </n-card>

      <!-- 危险信号 -->
      <n-card v-if="analysisStore.dangerSignals.length > 0" title="⚠️ 关系预警信号" class="danger-card">
        <n-space vertical>
          <n-alert
            v-for="(signal, i) in analysisStore.dangerSignals"
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

.time-filter {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
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

.stage-card {
  margin-bottom: 16px;
}

.stage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.stage-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stage-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.stage-confidence {
  font-size: 12px;
  color: var(--text-muted);
}

.stage-reasoning {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
