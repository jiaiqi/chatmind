<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  NCard, NTimeline, NTimelineItem, NTag, NEmpty,
  NSpace, NButton, useMessage, NPopover,
  NModal, NForm, NFormItem, NInput, NDatePicker,
} from 'naive-ui'
import VChart from 'vue-echarts'
import { registerECharts } from '../utils/echarts'
import { useSessionStore } from '../stores/session'
import { useAnalysisStore } from '../stores/analysis'
import { useThemeStore } from '../stores/theme'
import { buildChartOption } from '../utils/chart-theme'
import { EMOTION_COLORS, EMOTION_EMOJIS, EMOTION_LABELS, ROLE_COLORS } from '../constants/emotion'
import { calculateEmotionTrend } from '../analyzers/emotion'
import { detectAutoEvents } from '../analyzers/event-markers'
import { formatDateTime } from '../utils/date'
import type { DbMessage } from '../db/schema'
import type { EmotionLabel } from '../types/message'
import type { ChatEvent } from '../analyzers/event-markers'

registerECharts()

const sessionStore = useSessionStore()
const analysisStore = useAnalysisStore()
const themeStore = useThemeStore()
const message = useMessage()

const messages = ref<DbMessage[]>([])
const emotionTrend = ref<any[]>([])
const selectedDate = ref<string | null>(null)
const selectedMessages = ref<DbMessage[]>([])
const correctingMsgId = ref<string | null>(null)
const events = ref<ChatEvent[]>([])
const showAddEventModal = ref(false)
const newEventForm = ref({
  title: '',
  description: '',
  date: null as string | null,
  severity: 'medium' as 'low' | 'medium' | 'high',
})

const emotionColors = EMOTION_COLORS
const emotionLabels = EMOTION_EMOJIS
const emotionFullLabels = EMOTION_LABELS

const allEmotions: EmotionLabel[] = ['positive', 'negative', 'neutral', 'angry', 'sad', 'affectionate', 'indifferent']

async function handleEmotionChange(msgId: string, newEmotion: EmotionLabel) {
  correctingMsgId.value = null
  try {
    await sessionStore.updateMessageEmotion(msgId, newEmotion, 0.95, 'user')
    // 更新本地数据
    const msg = messages.value.find(m => m.id === msgId)
    if (msg) {
      msg.emotion = newEmotion
      msg.emotionScore = 0.95
      msg.emotionMethod = 'user'
    }
    const selMsg = selectedMessages.value.find(m => m.id === msgId)
    if (selMsg) {
      selMsg.emotion = newEmotion
      selMsg.emotionScore = 0.95
      selMsg.emotionMethod = 'user'
    }
    // 重新计算情绪趋势
    emotionTrend.value = calculateEmotionTrend(messages.value, 'day')
    message.success('情绪标签已更新')
  } catch {
    message.error('更新失败')
  }
}

async function loadData() {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId) return

  try {
    await analysisStore.ensureAnalysis(sessionId)
    messages.value = analysisStore.messages
    emotionTrend.value = analysisStore.emotionTrend.length
      ? analysisStore.emotionTrend
      : calculateEmotionTrend(messages.value, 'day')
    const autoEvents = detectAutoEvents(messages.value)
    const dbEvents = await sessionStore.getEvents(sessionId)
    const mappedUserEvents: ChatEvent[] = dbEvents.map(e => ({
      date: e.date,
      type: e.type as ChatEvent['type'],
      title: e.title,
      description: e.description,
      severity: e.severity,
      isAuto: e.isAuto,
    }))
    // 合并并按日期排序
    const merged = [...autoEvents, ...mappedUserEvents]
    const seen = new Set<string>()
    events.value = merged
      .filter(e => {
        const key = `${e.date}-${e.type}-${e.title}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch (err) {
    message.error('加载数据失败')
  }
}

watch(() => sessionStore.currentSessionId, loadData)
onMounted(loadData)

const chartOption = computed(() => {
  if (!emotionTrend.value.length) return {}

  return buildChartOption(themeStore.isDark, {
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
  })
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

function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    emotion_peak: '情绪低谷',
    silence_end: '沉默结束',
    volume_spike: '聊天高峰',
    argument: '争吵',
    milestone: '里程碑',
  }
  return labels[type] || type
}

function getEventTagType(severity: string): any {
  const types: Record<string, any> = {
    high: 'error',
    medium: 'warning',
    low: 'info',
  }
  return types[severity] || 'default'
}

function handleEventClick(eventDate: string) {
  selectedDate.value = eventDate
  const start = new Date(eventDate).getTime()
  const end = start + 24 * 60 * 60 * 1000
  selectedMessages.value = messages.value.filter(
    m => m.timestamp >= start && m.timestamp < end,
  )
}

async function handleAddEvent() {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId || !newEventForm.value.date || !newEventForm.value.title.trim()) {
    message.error('请填写标题和日期')
    return
  }
  try {
    await sessionStore.addEvent({
      sessionId,
      date: newEventForm.value.date,
      type: 'milestone',
      title: newEventForm.value.title.trim(),
      description: newEventForm.value.description.trim(),
      severity: newEventForm.value.severity,
      isAuto: false,
    })
    message.success('里程碑已添加')
    showAddEventModal.value = false
    newEventForm.value = { title: '', description: '', date: null, severity: 'medium' }
    await loadData()
  } catch {
    message.error('添加失败')
  }
}

async function handleDeleteUserEvent(date: string, title: string) {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId) return
  try {
    const dbEvents = await sessionStore.getEvents(sessionId)
    const target = dbEvents.find(e => e.date === date && e.title === title && !e.isAuto)
    if (target) {
      await sessionStore.deleteEvent(target.id)
      message.success('已删除')
      await loadData()
    }
  } catch {
    message.error('删除失败')
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

    <!-- 事件标记 -->
    <n-card title="关键事件" class="events-card">
      <template #header-extra>
        <n-button text size="small" @click="showAddEventModal = true">
          + 添加里程碑
        </n-button>
      </template>

      <n-space v-if="events.length > 0" vertical size="small">
        <div
          v-for="evt in events"
          :key="`${evt.date}-${evt.type}-${evt.title}`"
          class="event-item"
          @click="handleEventClick(evt.date)"
        >
          <n-tag :type="getEventTagType(evt.severity)" size="small" style="min-width: 64px; text-align: center">
            {{ getEventTypeLabel(evt.type) }}
          </n-tag>
          <span class="event-date">{{ evt.date }}</span>
          <span class="event-title">{{ evt.title }}</span>
          <span class="event-desc">{{ evt.description }}</span>
          <n-space style="margin-left: auto" size="small">
            <n-button text size="tiny" type="primary">查看</n-button>
            <n-button
              v-if="!evt.isAuto"
              text
              size="tiny"
              type="error"
              @click.stop="handleDeleteUserEvent(evt.date, evt.title)"
            >
              删除
            </n-button>
          </n-space>
        </div>
      </n-space>
      <n-empty v-else description="暂无事件，点击右上角添加里程碑" />
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
              <n-popover
                trigger="click"
                placement="bottom"
                :show="correctingMsgId === msg.id"
                @update:show="(v: boolean) => { if (!v) correctingMsgId = null }"
              >
                <template #trigger>
                  <n-tag
                    v-if="getEmotionTag(msg.emotion)"
                    size="small"
                    :color="{ textColor: getEmotionTag(msg.emotion)?.color, borderColor: getEmotionTag(msg.emotion)?.color }"
                    style="cursor: pointer"
                    @click="correctingMsgId = msg.id"
                  >
                    {{ getEmotionTag(msg.emotion)?.label }}
                    <span v-if="msg.emotionMethod === 'user'" style="opacity: 0.6; margin-left: 2px">✎</span>
                  </n-tag>
                </template>
                <div class="emotion-picker">
                  <div class="emotion-picker-title">修正情绪标签</div>
                  <div class="emotion-picker-grid">
                    <n-button
                      v-for="emo in allEmotions"
                      :key="emo"
                      size="small"
                      :type="msg.emotion === emo ? 'primary' : 'default'"
                      @click="handleEmotionChange(msg.id, emo)"
                    >
                      {{ emotionFullLabels[emo] }}
                    </n-button>
                  </div>
                </div>
              </n-popover>
            </n-space>
          </template>
          <div class="msg-content">{{ msg.content }}</div>
        </n-timeline-item>
      </n-timeline>

      <n-empty v-else description="当天暂无消息" />
    </n-card>

    <!-- 添加里程碑弹窗 -->
    <n-modal v-model:show="showAddEventModal" title="添加里程碑" preset="card" style="width: 420px; max-width: 90vw">
      <n-form label-placement="left" label-width="60">
        <n-form-item label="标题" required>
          <n-input v-model:value="newEventForm.title" placeholder="如：第一次约会、吵架和好..." />
        </n-form-item>
        <n-form-item label="日期" required>
          <n-date-picker v-model:formatted-value="newEventForm.date" value-format="yyyy-MM-dd" type="date" style="width: 100%" />
        </n-form-item>
        <n-form-item label="严重程度">
          <n-space>
            <n-tag
              v-for="s in ['low', 'medium', 'high']"
              :key="s"
              :type="newEventForm.severity === s ? getEventTagType(s) : 'default'"
              style="cursor: pointer"
              @click="newEventForm.severity = s as any"
            >
              {{ s === 'low' ? '普通' : s === 'medium' ? '重要' : '重大' }}
            </n-tag>
          </n-space>
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="newEventForm.description" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="可选：补充细节..." />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="showAddEventModal = false">取消</n-button>
          <n-button type="primary" @click="handleAddEvent">添加</n-button>
        </n-space>
      </template>
    </n-modal>
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
  color: var(--text-muted);
}

.msg-content {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  margin-top: 4px;
}

.emotion-picker {
  padding: 8px;
  min-width: 200px;
}

.emotion-picker-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-color);
}

.emotion-picker-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.events-card {
  margin-bottom: 16px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  border: 1px solid var(--border-color);
}

.event-item:hover {
  background: var(--hover-bg);
}

.event-date {
  font-size: 12px;
  color: var(--text-muted);
  min-width: 80px;
}

.event-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}

.event-desc {
  font-size: 12px;
  color: var(--text-secondary);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
