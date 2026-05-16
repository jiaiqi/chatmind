<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  NCard, NTimeline, NTimelineItem, NTag, NEmpty,
  NSpace, NButton, useMessage,
} from 'naive-ui'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent, DataZoomComponent,
} from 'echarts/components'
import { useSessionStore } from '../stores/session'
import { calculateEmotionTrend } from '../analyzers/emotion'
import { formatDateTime } from '../utils/date'
import type { DbMessage } from '../db/schema'
import type { EmotionLabel } from '../types/message'

use([
  CanvasRenderer,
  LineChart,
  GridComponent, TooltipComponent, LegendComponent,
  TitleComponent, DataZoomComponent,
])

const sessionStore = useSessionStore()
const message = useMessage()

const messages = ref<DbMessage[]>([])
const emotionTrend = ref<any[]>([])
const selectedDate = ref<string | null>(null)
const selectedMessages = ref<DbMessage[]>([])

const emotionColors: Record<EmotionLabel, string> = {
  positive: '#18a058',
  negative: '#d03050',
  neutral: '#909399',
  angry: '#f56c6c',
  sad: '#909399',
  affectionate: '#e6a23c',
  indifferent: '#c0c4cc',
}

const emotionLabels: Record<string, string> = {
  positive: '😊',
  negative: '😟',
  neutral: '😐',
  angry: '😡',
  sad: '😢',
  affectionate: '💕',
  indifferent: '🙄',
}

async function loadData() {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId) return

  try {
    messages.value = await sessionStore.getMessagesByTimeRange(sessionId, 0, Date.now())
    emotionTrend.value = calculateEmotionTrend(messages.value, 'day')
  } catch (err) {
    message.error('加载数据失败')
  }
}

watch(() => sessionStore.currentSessionId, loadData)
onMounted(loadData)

const chartOption = computed(() => {
  if (!emotionTrend.value.length) return {}

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const date = params[0]?.axisValue
        const row = emotionTrend.value.find(d => d.date === date)
        if (!row) return ''

        return `
          <div style="font-weight:bold;margin-bottom:4px">${date}</div>
          <div style="color:#18a058">我: 😊${row.selfPositive} 😟${row.selfNegative}</div>
          <div style="color:#2080f0">对方: 😊${row.otherPositive} 😟${row.otherNegative}</div>
        `
      },
    },
    legend: { data: ['我-正面', '我-负面', '对方-正面', '对方-负面'] },
    grid: { left: '3%', right: '4%', bottom: '12%', top: '10%', containLabel: true },
    dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 0 }],
    xAxis: {
      type: 'category',
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
  }
})

function handleChartClick(params: any) {
  const date = params.axisValue
  selectedDate.value = date

  const start = new Date(date).getTime()
  const end = start + 24 * 60 * 60 * 1000
  selectedMessages.value = messages.value.filter(
    m => m.timestamp >= start && m.timestamp < end
  )
}

function getEmotionTag(emotion?: EmotionLabel) {
  if (!emotion) return null
  return {
    label: emotionLabels[emotion] || emotion,
    color: emotionColors[emotion] || '#909399',
  }
}
</script>

<template>
  <div class="timeline-view">
    <n-card title="情绪时间轴" class="chart-card">
      <v-chart
        class="chart"
        :option="chartOption"
        autoresize
        @click="handleChartClick"
      />
      <n-text depth="3" style="display: block; text-align: center; margin-top: 8px">
        点击曲线上的任意点，查看当天的聊天记录
      </n-text>
    </n-card>

    <n-card v-if="selectedDate" :title="`${selectedDate} 的聊天记录`" class="detail-card">
      <template #header-extra>
        <n-button text size="small" @click="selectedDate = null">
          关闭
        </n-button>
      </template>

      <n-timeline v-if="selectedMessages.length > 0">
        <n-timeline-item
          v-for="msg in selectedMessages"
          :key="msg.id"
          :type="msg.isSelf ? 'success' : 'info'"
        >
          <template #header>
            <n-space align="center" size="small">
              <span class="sender-label">{{ msg.isSelf ? '我' : '对方' }}</span>
              <span class="msg-time">{{ formatDateTime(msg.timestamp) }}</span>
              <n-tag
                v-if="getEmotionTag(msg.emotion)"
                size="small"
                :color="{ textColor: getEmotionTag(msg.emotion)?.color, borderColor: getEmotionTag(msg.emotion)?.color }"
              >
                {{ getEmotionTag(msg.emotion)?.label }}
              </n-tag>
            </n-space>
          </template>
          <div class="msg-content">{{ msg.content }}</div>
        </n-timeline-item>
      </n-timeline>

      <n-empty v-else description="当天暂无消息" />
    </n-card>
  </div>
</template>

<style scoped>
.timeline-view {
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
}

.chart-card {
  margin-bottom: 16px;
}

.chart {
  height: 400px;
}

.detail-card {
  margin-bottom: 16px;
}

.sender-label {
  font-weight: 500;
  font-size: 13px;
}

.msg-time {
  font-size: 12px;
  color: #999;
}

.msg-content {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  margin-top: 4px;
}
</style>
