<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  NCard, NGrid, NGridItem, NEmpty, useMessage, NTag, NSpace,
} from 'naive-ui'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import {
  BarChart, LineChart, PieChart, HeatmapChart, ScatterChart,
} from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent, VisualMapComponent, CalendarComponent,
} from 'echarts/components'
import 'echarts-wordcloud'
import { useSessionStore } from '../stores/session'
import { useThemeStore } from '../stores/theme'
import { buildChartOption } from '../utils/chart-theme'
import {
  calculateWordFrequency,
  calculateReplyDelayDistribution,
  calculateMessageLengthTrend,
  calculateCalendarData,
  calculateEmotionDistribution,
} from '../analyzers/word-frequency'
import { formatDuration } from '../analyzers/statistics'
import type { DbMessage } from '../db/schema'

use([
  CanvasRenderer,
  BarChart, LineChart, PieChart, HeatmapChart, ScatterChart,
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent, VisualMapComponent, CalendarComponent,
])

const sessionStore = useSessionStore()
const themeStore = useThemeStore()
const message = useMessage()

const messages = ref<DbMessage[]>([])
const isLoading = ref(false)

const hasData = computed(() =>
  sessionStore.currentSession !== null && messages.value.length > 0,
)

async function loadData() {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId) return

  isLoading.value = true
  try {
    messages.value = await sessionStore.getMessagesByTimeRange(sessionId, 0, Date.now())
  } catch (err) {
    message.error('加载数据失败')
  } finally {
    isLoading.value = false
  }
}

watch(() => sessionStore.currentSessionId, loadData)
onMounted(loadData)

// 词云
const wordCloudData = computed(() => {
  if (!messages.value.length) return { self: [], other: [], all: [] }
  const { selfWords, otherWords, allWords } = calculateWordFrequency(messages.value, 60)
  return {
    self: selfWords.map(w => ({ name: w.word, value: w.count })),
    other: otherWords.map(w => ({ name: w.word, value: w.count })),
    all: allWords.map(w => ({ name: w.word, value: w.count })),
  }
})

const selfWordCloudOption = computed(() => buildChartOption(themeStore.isDark, {
  tooltip: { show: true },
  series: [{
    type: 'wordCloud',
    shape: 'circle',
    left: 'center',
    top: 'center',
    width: '90%',
    height: '90%',
    sizeRange: [12, 50],
    rotationRange: [-45, 45],
    rotationStep: 45,
    gridSize: 8,
    drawOutOfBound: false,
    textStyle: {
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      color: () => `hsl(${Math.random() * 60 + 100}, 70%, ${themeStore.isDark ? 65 : 50}%)`,
    },
    emphasis: {
      focus: 'self',
      textStyle: { textShadowBlur: 10, textShadowColor: themeStore.isDark ? '#000' : '#333' },
    },
    data: wordCloudData.value.self,
  }],
}))

const otherWordCloudOption = computed(() => buildChartOption(themeStore.isDark, {
  tooltip: { show: true },
  series: [{
    type: 'wordCloud',
    shape: 'circle',
    left: 'center',
    top: 'center',
    width: '90%',
    height: '90%',
    sizeRange: [12, 50],
    rotationRange: [-45, 45],
    rotationStep: 45,
    gridSize: 8,
    drawOutOfBound: false,
    textStyle: {
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      color: () => `hsl(${Math.random() * 60 + 200}, 70%, ${themeStore.isDark ? 65 : 50}%)`,
    },
    emphasis: {
      focus: 'self',
      textStyle: { textShadowBlur: 10, textShadowColor: themeStore.isDark ? '#000' : '#333' },
    },
    data: wordCloudData.value.other,
  }],
}))

// 回复延迟分布
const replyDelayData = computed(() => {
  if (!messages.value.length) return null
  return calculateReplyDelayDistribution(messages.value)
})

const replyDelayOption = computed(() => {
  if (!replyDelayData.value) return {}
  return buildChartOption(themeStore.isDark, {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['我的回复', '对方回复'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: replyDelayData.value.delays.map(d => d.range) },
    yAxis: { type: 'value', name: '次数' },
    series: [
      {
        name: '我的回复',
        type: 'bar',
        data: replyDelayData.value.delays.map(d => d.selfDelay),
        itemStyle: { color: '#18a058' },
      },
      {
        name: '对方回复',
        type: 'bar',
        data: replyDelayData.value.delays.map(d => d.otherDelay),
        itemStyle: { color: '#2080f0' },
      },
    ],
  })
})

// 消息长度趋势
const lengthTrendData = computed(() => {
  if (!messages.value.length) return null
  return calculateMessageLengthTrend(messages.value)
})

const lengthTrendOption = computed(() => {
  if (!lengthTrendData.value) return {}
  return buildChartOption(themeStore.isDark, {
    tooltip: { trigger: 'axis' },
    legend: { data: ['我', '对方'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: lengthTrendData.value.dates,
    },
    yAxis: { type: 'value', name: '平均字数' },
    series: [
      {
        name: '我',
        type: 'line',
        smooth: true,
        data: lengthTrendData.value.selfLengths,
        itemStyle: { color: '#18a058' },
        connectNulls: true,
      },
      {
        name: '对方',
        type: 'line',
        smooth: true,
        data: lengthTrendData.value.otherLengths,
        itemStyle: { color: '#2080f0' },
        connectNulls: true,
      },
    ],
  })
})

// 日历热力图
const calendarData = computed(() => {
  if (!messages.value.length) return []
  return calculateCalendarData(messages.value)
})

const calendarOption = computed(() => {
  if (!calendarData.value.length) return {}

  const dates = calendarData.value.map(d => d.date)
  const minDate = dates[0]
  const maxDate = dates[dates.length - 1]
  const data = calendarData.value.map(d => [d.date, d.count])

  return buildChartOption(themeStore.isDark, {
    tooltip: {
      formatter: (p: any) => `${p.data[0]}: ${p.data[1]} 条消息`,
    },
    visualMap: {
      min: 0,
      max: Math.max(...calendarData.value.map(d => d.count), 10),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: {
        color: themeStore.isDark
          ? ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
          : ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'],
      },
    },
    calendar: {
      top: 40,
      left: 40,
      right: 20,
      cellSize: ['auto', 18],
      range: [minDate, maxDate],
      itemStyle: {
        borderWidth: 0.5,
      },
      splitLine: { show: false },
      yearLabel: { show: false },
      dayLabel: {
        firstDay: 1,
        nameMap: 'cn',
      },
      monthLabel: {
        nameMap: 'cn',
      },
    },
    series: [{
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data,
    }],
  })
})

// 情绪分布
const emotionDistData = computed(() => {
  if (!messages.value.length) return null
  return calculateEmotionDistribution(messages.value)
})

const emotionDistOption = computed(() => {
  if (!emotionDistData.value) return {}

  const emotions = [
    { key: 'positive', name: '😊 正面', color: '#18a058' },
    { key: 'negative', name: '😟 负面', color: '#d03050' },
    { key: 'neutral', name: '😐 中性', color: '#909399' },
    { key: 'angry', name: '😡 愤怒', color: '#f56c6c' },
    { key: 'sad', name: '😢 悲伤', color: '#909399' },
    { key: 'affectionate', name: '💕 亲昵', color: '#e6a23c' },
    { key: 'indifferent', name: '🙄 敷衍', color: '#c0c4cc' },
  ]

  return buildChartOption(themeStore.isDark, {
    tooltip: { trigger: 'axis' },
    legend: { data: ['我', '对方'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: emotions.map(e => e.name),
    },
    yAxis: { type: 'value', name: '消息数' },
    series: [
      {
        name: '我',
        type: 'bar',
        data: emotions.map(e => emotionDistData.value?.self[e.key] || 0),
        itemStyle: { color: '#18a058' },
      },
      {
        name: '对方',
        type: 'bar',
        data: emotions.map(e => emotionDistData.value?.other[e.key] || 0),
        itemStyle: { color: '#2080f0' },
      },
    ],
  })
})
</script>

<template>
  <div class="analysis-view">
    <template v-if="hasData">
      <div class="analysis-header">
        <h2>深度分析</h2>
      </div>

      <!-- 词云 -->
      <n-grid :cols="2" :x-gap="16" class="chart-row">
        <n-grid-item>
          <n-card title="我的高频词" class="chart-card">
            <v-chart class="wordcloud-chart" :option="selfWordCloudOption" autoresize />
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card title="对方的高频词" class="chart-card">
            <v-chart class="wordcloud-chart" :option="otherWordCloudOption" autoresize />
          </n-card>
        </n-grid-item>
      </n-grid>

      <!-- 日历热力图 -->
      <n-card title="聊天日历" class="chart-card">
        <v-chart class="calendar-chart" :option="calendarOption" autoresize />
      </n-card>

      <!-- 回复延迟 + 消息长度 -->
      <n-grid :cols="2" :x-gap="16" class="chart-row">
        <n-grid-item>
          <n-card title="回复延迟分布" class="chart-card">
            <v-chart class="chart" :option="replyDelayOption" autoresize />
            <n-space v-if="replyDelayData" style="margin-top: 8px; justify-content: center">
              <n-tag type="success" size="small">
                我平均: {{ formatDuration(replyDelayData.avgSelfDelay) }}
              </n-tag>
              <n-tag type="info" size="small">
                对方平均: {{ formatDuration(replyDelayData.avgOtherDelay) }}
              </n-tag>
            </n-space>
          </n-card>
        </n-grid-item>
        <n-grid-item>
          <n-card title="消息长度趋势" class="chart-card">
            <v-chart class="chart" :option="lengthTrendOption" autoresize />
          </n-card>
        </n-grid-item>
      </n-grid>

      <!-- 情绪分布 -->
      <n-card title="情绪分布对比" class="chart-card">
        <v-chart class="chart" :option="emotionDistOption" autoresize />
      </n-card>
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
.analysis-view {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.analysis-header {
  margin-bottom: 24px;
}

.analysis-header h2 {
  margin: 0;
  font-size: 24px;
  color: var(--text-color);
}

.chart-row {
  margin-bottom: 16px;
}

.chart-card {
  margin-bottom: 16px;
}

.chart {
  height: 300px;
}

.wordcloud-chart {
  height: 350px;
}

.calendar-chart {
  height: 220px;
}
</style>
