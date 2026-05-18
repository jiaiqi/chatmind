<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  NCard, NGrid, NGridItem, NEmpty, useMessage, NTag, NSpace,
  NInput, NButton, NH3, NProgress, NDivider,
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
import { useAnalysisStore } from '../stores/analysis'
import { useThemeStore } from '../stores/theme'
import { buildChartOption } from '../utils/chart-theme'
import {
  calculateWordFrequency,
  calculateReplyDelayDistribution,
  calculateMessageLengthTrend,
  calculateCalendarData,
  calculateEmotionDistribution,
} from '../analyzers/word-frequency'
import { calculateStatistics, formatDuration } from '../analyzers/statistics'
import { calculateEmotionDynamics } from '../analyzers/emotion-dynamics'
import { trackKeyword, highlightKeyword } from '../analyzers/keyword-track'
import { calculateTimeShift } from '../analyzers/time-shift'
import type { DbMessage } from '../db/schema'
import type { KeywordTrendPoint, KeywordMatch } from '../analyzers/keyword-track'

use([
  CanvasRenderer,
  BarChart, LineChart, PieChart, HeatmapChart, ScatterChart,
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent, VisualMapComponent, CalendarComponent,
])

const sessionStore = useSessionStore()
const analysisStore = useAnalysisStore()
const themeStore = useThemeStore()
const message = useMessage()

const messages = ref<DbMessage[]>([])
const isLoading = ref(false)

// 关键词追踪
const keywordInput = ref('')
const keywordTrend = ref<KeywordTrendPoint[]>([])
const keywordMatches = ref<KeywordMatch[]>([])
const isAnalyzingKeyword = ref(false)

function analyzeKeyword() {
  const keyword = keywordInput.value.trim()
  if (!keyword || !messages.value.length) {
    keywordTrend.value = []
    keywordMatches.value = []
    return
  }
  isAnalyzingKeyword.value = true
  const result = trackKeyword(messages.value, keyword, 'day')
  keywordTrend.value = result.trend
  keywordMatches.value = result.matches
  isAnalyzingKeyword.value = false
}

const hasKeywordResult = computed(() => keywordTrend.value.length > 0)

const keywordTrendOption = computed(() => {
  if (!keywordTrend.value.length) return {}
  return buildChartOption(themeStore.isDark, {
    tooltip: { trigger: 'axis' },
    legend: { data: ['我', '对方'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: keywordTrend.value.map(d => d.date),
    },
    yAxis: { type: 'value', name: '次数', minInterval: 1 },
    series: [
      {
        name: '我',
        type: 'bar',
        data: keywordTrend.value.map(d => d.selfCount),
        itemStyle: { color: '#18a058' },
      },
      {
        name: '对方',
        type: 'bar',
        data: keywordTrend.value.map(d => d.otherCount),
        itemStyle: { color: '#2080f0' },
      },
    ],
  })
})

const hasData = computed(() =>
  sessionStore.currentSession !== null && messages.value.length > 0,
)

async function loadData() {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId) return

  isLoading.value = true
  try {
    await analysisStore.ensureAnalysis(sessionId)
    messages.value = analysisStore.messages
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

// 情绪动态分析
const emotionDynamics = computed(() => {
  if (!messages.value.length) return null
  return calculateEmotionDynamics(messages.value)
})

// 聊天时段迁移
const timeShiftData = computed(() => {
  if (!messages.value.length) return null
  return calculateTimeShift(messages.value)
})

const timeShiftOption = computed(() => {
  if (!timeShiftData.value) return {}
  const shifts = timeShiftData.value.hourlyShifts
  return buildChartOption(themeStore.isDark, {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['前期', '后期'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: shifts.map(d => `${d.hour}时`),
    },
    yAxis: { type: 'value', name: '消息数' },
    series: [
      {
        name: '前期',
        type: 'bar',
        data: shifts.map(d => d.beforeCount),
        itemStyle: { color: '#909399', opacity: 0.7 },
      },
      {
        name: '后期',
        type: 'bar',
        data: shifts.map(d => d.afterCount),
        itemStyle: { color: '#2080f0' },
      },
    ],
  })
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

// 并排对比数据
const comparisonData = computed(() => {
  if (!messages.value.length) return null

  const stats = calculateStatistics(messages.value)
  const selfMsgs = messages.value.filter(m => m.isSelf)
  const otherMsgs = messages.value.filter(m => !m.isSelf)

  const { selfWords, otherWords } = calculateWordFrequency(messages.value, 10)

  const selfEmotions = selfMsgs.reduce((acc, m) => {
    if (m.emotion) acc[m.emotion] = (acc[m.emotion] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const otherEmotions = otherMsgs.reduce((acc, m) => {
    if (m.emotion) acc[m.emotion] = (acc[m.emotion] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const selfTotalEmotion = Object.values(selfEmotions).reduce((a, b) => a + b, 0) || 1
  const otherTotalEmotion = Object.values(otherEmotions).reduce((a, b) => a + b, 0) || 1

  const selfPositiveRatio = ((selfEmotions['positive'] || 0) + (selfEmotions['affectionate'] || 0)) / selfTotalEmotion
  const otherPositiveRatio = ((otherEmotions['positive'] || 0) + (otherEmotions['affectionate'] || 0)) / otherTotalEmotion

  return {
    selfWords: selfWords.slice(0, 10),
    otherWords: otherWords.slice(0, 10),
    selfMessageCount: selfMsgs.length,
    otherMessageCount: otherMsgs.length,
    selfAvgLength: stats.avgLength.self.toFixed(1),
    otherAvgLength: stats.avgLength.other.toFixed(1),
    selfReplyDelay: formatDuration(stats.avgSelfReplyDelay),
    otherReplyDelay: formatDuration(stats.avgOtherReplyDelay),
    selfPositiveRatio,
    otherPositiveRatio,
    selfIndifferentRatio: (selfEmotions['indifferent'] || 0) / selfTotalEmotion,
    otherIndifferentRatio: (otherEmotions['indifferent'] || 0) / otherTotalEmotion,
  }
})
</script>

<template>
  <div class="analysis-view">
    <template v-if="hasData">
      <div class="analysis-header">
        <h2>深度分析</h2>
      </div>

      <!-- 关键词追踪 -->
      <n-card title="关键词追踪" class="chart-card">
        <div class="keyword-input-row">
          <n-input
            v-model:value="keywordInput"
            placeholder="输入关键词，如：晚安、哈哈、加班..."
            clearable
            style="max-width: 300px"
            @keyup.enter="analyzeKeyword"
          />
          <n-button type="primary" :loading="isAnalyzingKeyword" @click="analyzeKeyword">
            分析
          </n-button>
        </div>

        <template v-if="hasKeywordResult">
          <v-chart class="chart" :option="keywordTrendOption" autoresize />

          <n-h3 prefix="bar" style="margin-top: 24px; font-size: 16px">
            共 {{ keywordMatches.length }} 条匹配
          </n-h3>
          <div class="keyword-matches">
            <div
              v-for="(match, idx) in keywordMatches"
              :key="idx"
              class="match-item"
            >
              <div class="match-context">
                <div
                  v-for="ctx in match.contextBefore"
                  :key="ctx.id"
                  class="context-msg context-before"
                >
                  <span class="msg-sender">{{ ctx.isSelf ? '我' : '对方' }}</span>
                  <span class="msg-content">{{ ctx.content }}</span>
                </div>
                <div class="match-msg">
                  <span class="msg-sender">{{ match.message.isSelf ? '我' : '对方' }}</span>
                  <span class="msg-time">{{ new Date(match.message.timestamp).toLocaleString('zh-CN') }}</span>
                  <span class="msg-content" v-html="highlightKeyword(match.message.content, keywordInput)"></span>
                </div>
                <div
                  v-for="ctx in match.contextAfter"
                  :key="ctx.id"
                  class="context-msg context-after"
                >
                  <span class="msg-sender">{{ ctx.isSelf ? '我' : '对方' }}</span>
                  <span class="msg-content">{{ ctx.content }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <n-empty v-else-if="keywordInput.trim()" description="未找到匹配消息" style="margin-top: 16px" />
      </n-card>

      <!-- 并排对比 -->
      <n-card v-if="comparisonData" title="双方对比" class="chart-card">
        <n-grid :cols="2" :x-gap="24">
          <n-grid-item>
            <div class="comparison-column">
              <div class="comparison-header" style="color: #18a058">
                <n-tag type="success" size="small">我</n-tag>
                <span class="comparison-count">{{ comparisonData.selfMessageCount }} 条消息</span>
              </div>
              <div class="comparison-words">
                <div v-for="(w, i) in comparisonData.selfWords" :key="i" class="comparison-word-row">
                  <span class="comparison-rank">{{ i + 1 }}</span>
                  <span class="comparison-word">{{ w.word }}</span>
                  <n-progress
                    type="line"
                    :percentage="Math.min(100, (w.count / comparisonData.selfWords[0].count) * 100)"
                    :height="6"
                    :show-indicator="false"
                    color="#18a058"
                    style="width: 80px"
                  />
                  <span class="comparison-word-count">{{ w.count }}</span>
                </div>
              </div>
            </div>
          </n-grid-item>

          <n-grid-item>
            <div class="comparison-column">
              <div class="comparison-header" style="color: #2080f0">
                <n-tag type="info" size="small">对方</n-tag>
                <span class="comparison-count">{{ comparisonData.otherMessageCount }} 条消息</span>
              </div>
              <div class="comparison-words">
                <div v-for="(w, i) in comparisonData.otherWords" :key="i" class="comparison-word-row">
                  <span class="comparison-rank">{{ i + 1 }}</span>
                  <span class="comparison-word">{{ w.word }}</span>
                  <n-progress
                    type="line"
                    :percentage="Math.min(100, (w.count / comparisonData.otherWords[0].count) * 100)"
                    :height="6"
                    :show-indicator="false"
                    color="#2080f0"
                    style="width: 80px"
                  />
                  <span class="comparison-word-count">{{ w.count }}</span>
                </div>
              </div>
            </div>
          </n-grid-item>
        </n-grid>

        <n-divider style="margin: 16px 0" />

        <n-grid :cols="5" :x-gap="16">
          <n-grid-item>
            <div class="comparison-metric">
              <div class="comparison-metric-label">平均字数</div>
              <div class="comparison-metric-value">
                <span style="color: #18a058">{{ comparisonData.selfAvgLength }}</span>
                <span style="color: #999; margin: 0 4px">vs</span>
                <span style="color: #2080f0">{{ comparisonData.otherAvgLength }}</span>
              </div>
            </div>
          </n-grid-item>
          <n-grid-item>
            <div class="comparison-metric">
              <div class="comparison-metric-label">平均回复时间</div>
              <div class="comparison-metric-value">
                <span style="color: #18a058">{{ comparisonData.selfReplyDelay }}</span>
                <span style="color: #999; margin: 0 4px">vs</span>
                <span style="color: #2080f0">{{ comparisonData.otherReplyDelay }}</span>
              </div>
            </div>
          </n-grid-item>
          <n-grid-item>
            <div class="comparison-metric">
              <div class="comparison-metric-label">正面情绪</div>
              <div class="comparison-metric-value">
                <span style="color: #18a058">{{ (comparisonData.selfPositiveRatio * 100).toFixed(1) }}%</span>
                <span style="color: #999; margin: 0 4px">vs</span>
                <span style="color: #2080f0">{{ (comparisonData.otherPositiveRatio * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </n-grid-item>
          <n-grid-item>
            <div class="comparison-metric">
              <div class="comparison-metric-label">敷衍占比</div>
              <div class="comparison-metric-value">
                <span style="color: #18a058">{{ (comparisonData.selfIndifferentRatio * 100).toFixed(1) }}%</span>
                <span style="color: #999; margin: 0 4px">vs</span>
                <span style="color: #2080f0">{{ (comparisonData.otherIndifferentRatio * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </n-grid-item>
          <n-grid-item>
            <div class="comparison-metric">
              <div class="comparison-metric-label">消息占比</div>
              <div class="comparison-metric-value">
                <span style="color: #18a058">{{ ((comparisonData.selfMessageCount / (comparisonData.selfMessageCount + comparisonData.otherMessageCount)) * 100).toFixed(1) }}%</span>
                <span style="color: #999; margin: 0 4px">vs</span>
                <span style="color: #2080f0">{{ ((comparisonData.otherMessageCount / (comparisonData.selfMessageCount + comparisonData.otherMessageCount)) * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </n-grid-item>
        </n-grid>
      </n-card>

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

      <!-- 聊天时段迁移 -->
      <n-card v-if="timeShiftData" title="聊天时段迁移" class="chart-card">
        <v-chart class="chart" :option="timeShiftOption" autoresize />
        <n-space v-if="timeShiftData" size="small" style="margin-top: 12px">
          <n-tag v-if="timeShiftData.mostDeclinedHour" type="warning" size="small">
            {{ timeShiftData.mostDeclinedHour.hour }}时 减少最多（-{{ timeShiftData.mostDeclinedHour.change }}条）
          </n-tag>
          <n-tag v-if="timeShiftData.mostIncreasedHour" type="success" size="small">
            {{ timeShiftData.mostIncreasedHour.hour }}时 增加最多（+{{ timeShiftData.mostIncreasedHour.change }}条）
          </n-tag>
          <n-tag size="small">
            整体{{ timeShiftData.overallChangeRatio >= 0 ? '增加' : '减少' }} {{ (Math.abs(timeShiftData.overallChangeRatio) * 100).toFixed(0) }}%
          </n-tag>
        </n-space>
      </n-card>

      <!-- 情绪分布 -->
      <n-card title="情绪分布对比" class="chart-card">
        <v-chart class="chart" :option="emotionDistOption" autoresize />
      </n-card>

      <!-- 情绪动态分析 -->
      <n-card v-if="emotionDynamics" title="情绪互动模式" class="chart-card">
        <n-grid :cols="3" :x-gap="16">
          <n-grid-item>
            <div class="dynamics-section">
              <div class="dynamics-title">情绪感染度</div>
              <div class="dynamics-desc">一方负面情绪后，另一方也出现负面的概率</div>
              <n-space vertical size="small" style="margin-top: 12px">
                <div class="dynamics-row">
                  <span class="dynamics-label">我方 → 对方</span>
                  <n-progress
                    type="line"
                    :percentage="Math.round(emotionDynamics.contagion.selfToOther * 100)"
                    :height="8"
                    :show-indicator="false"
                    :color="emotionDynamics.contagion.selfToOther > 0.5 ? '#d03050' : '#18a058'"
                    style="width: 120px"
                  />
                  <span class="dynamics-value">{{ (emotionDynamics.contagion.selfToOther * 100).toFixed(0) }}%</span>
                </div>
                <div class="dynamics-row">
                  <span class="dynamics-label">对方 → 我方</span>
                  <n-progress
                    type="line"
                    :percentage="Math.round(emotionDynamics.contagion.otherToSelf * 100)"
                    :height="8"
                    :show-indicator="false"
                    :color="emotionDynamics.contagion.otherToSelf > 0.5 ? '#d03050' : '#18a058'"
                    style="width: 120px"
                  />
                  <span class="dynamics-value">{{ (emotionDynamics.contagion.otherToSelf * 100).toFixed(0) }}%</span>
                </div>
                <div class="dynamics-row">
                  <span class="dynamics-label">总体感染率</span>
                  <n-progress
                    type="line"
                    :percentage="Math.round(emotionDynamics.contagion.overall * 100)"
                    :height="8"
                    :show-indicator="false"
                    :color="emotionDynamics.contagion.overall > 0.5 ? '#d03050' : '#18a058'"
                    style="width: 120px"
                  />
                  <span class="dynamics-value">{{ (emotionDynamics.contagion.overall * 100).toFixed(0) }}%</span>
                </div>
              </n-space>
            </div>
          </n-grid-item>

          <n-grid-item>
            <div class="dynamics-section">
              <div class="dynamics-title">情绪修复时间</div>
              <div class="dynamics-desc">负面事件结束后，恢复正面交流的平均时间</div>
              <div class="dynamics-metric" style="margin-top: 12px">
                <div class="dynamics-metric-value">{{ emotionDynamics.recovery.avgRecoveryTimeText }}</div>
                <div class="dynamics-metric-label">平均修复时间</div>
              </div>
              <n-space vertical size="small" style="margin-top: 8px">
                <n-tag size="small" type="info"
                  >修复事件: {{ emotionDynamics.recovery.recoveryCount }}</n-tag
                >
                <n-tag
                  v-if="emotionDynamics.recovery.unresolvedCount > 0"
                  size="small"
                  type="warning"
                >
                  未修复: {{ emotionDynamics.recovery.unresolvedCount }}
                </n-tag>
              </n-space>
            </div>
          </n-grid-item>

          <n-grid-item>
            <div class="dynamics-section">
              <div class="dynamics-title">情绪对抗模式</div>
              <div class="dynamics-desc">双方负面情绪交替出现的情况</div>
              <n-space vertical size="small" style="margin-top: 12px">
                <div class="dynamics-row">
                  <span class="dynamics-label">升级事件</span>
                  <span class="dynamics-value" :style="{ color: emotionDynamics.confrontation.escalationCount > 0 ? '#d03050' : '#18a058' }"
                    >{{ emotionDynamics.confrontation.escalationCount }} 次</span
                  >
                </div>
                <div class="dynamics-row">
                  <span class="dynamics-label">降级/安抚</span>
                  <span class="dynamics-value" style="color: #18a058"
                    >{{ emotionDynamics.confrontation.deEscalationCount }} 次</span
                  >
                </div>
                <div class="dynamics-row" v-if="emotionDynamics.confrontation.escalationCount > 0"
                >
                  <span class="dynamics-label">平均升级轮次</span>
                  <span class="dynamics-value">{{ emotionDynamics.confrontation.avgEscalationRounds.toFixed(1) }} 轮</span>
                </div>
              </n-space>
            </div>
          </n-grid-item>
        </n-grid>
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

.dynamics-section {
  padding: 8px;
}

.dynamics-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.dynamics-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.dynamics-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.dynamics-label {
  color: var(--text-secondary);
  min-width: 72px;
}

.dynamics-value {
  font-weight: 500;
  color: var(--text-color);
  min-width: 48px;
  text-align: right;
}

.dynamics-metric {
  text-align: center;
  padding: 8px;
  background: var(--hover-bg);
  border-radius: 8px;
}

.dynamics-metric-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-color);
}

.dynamics-metric-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

.comparison-column {
  padding: 8px;
}

.comparison-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 500;
}

.comparison-count {
  font-size: 12px;
  color: var(--text-muted);
}

.comparison-words {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.comparison-word-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.comparison-rank {
  width: 18px;
  text-align: center;
  color: var(--text-muted);
  font-size: 11px;
}

.comparison-word {
  flex: 1;
  color: var(--text-color);
}

.comparison-word-count {
  width: 28px;
  text-align: right;
  color: var(--text-muted);
  font-size: 11px;
}

.comparison-metric {
  text-align: center;
  padding: 8px;
}

.comparison-metric-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.comparison-metric-value {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}

.keyword-input-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.keyword-matches {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.match-item {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  background: var(--card-bg);
}

.match-context {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.context-msg {
  font-size: 13px;
  color: var(--text-secondary);
  padding: 2px 0;
}

.context-before,
.context-after {
  opacity: 0.7;
}

.match-msg {
  font-size: 14px;
  padding: 6px 0;
  border-left: 3px solid #18a058;
  padding-left: 10px;
  margin: 4px 0;
  background: var(--hover-bg);
  border-radius: 0 4px 4px 0;
}

.msg-sender {
  font-weight: 500;
  margin-right: 8px;
  color: var(--text-color);
  min-width: 32px;
  display: inline-block;
}

.msg-time {
  font-size: 12px;
  color: var(--text-muted);
  margin-right: 8px;
}

.msg-content :deep(mark) {
  background: #fff3cd;
  color: #856404;
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 600;
}
</style>
