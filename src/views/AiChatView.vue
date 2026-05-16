<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import {
  NInput, NButton, NSpace, NEmpty,
  NAvatar, NSpin, NDivider, NIcon,
  NTag, useMessage, NModal, NTimeline, NTimelineItem,
} from 'naive-ui'
import { SparklesOutline, SendOutline, TrashOutline, PersonOutline, SettingsOutline } from '@vicons/ionicons5'
import { useAiStore } from '../stores/ai'
import { useModelConfigStore } from '../stores/model-config'
import ModelConfigDialog from '../components/ModelConfig/ModelConfigDialog.vue'

const aiStore = useAiStore()
const modelConfig = useModelConfigStore()
const message = useMessage()

const inputValue = ref('')
const chatContainer = ref<HTMLDivElement | null>(null)
const showConfigDialog = ref(false)
const showTraceModal = ref(false)
const traceDate = ref('')
const traceMessages = ref<any[]>([])

const quickQuestions = [
  '最近我们的关系怎么样？',
  '谁在这段关系里更主动？',
  '谁回复消息更快？',
  '我们的聊天高峰是什么时候？',
  '最近30天和之前比有什么变化？',
  'TA 最常用的词是什么？',
  '我们的沟通模式有什么特点？',
  '有什么需要注意的问题吗？',
  '我们之间有什么潜在的危机信号？',
  '最近一次关系低谷是什么时候？',
  '怎么改善我们的关系？',
]

function formatMessageContent(content: string): string {
  // 将 [MSG:YYYY-MM-DD] 替换为可点击链接
  return content
    .replace(/\[MSG:(\d{4}-\d{2}-\d{2})\]/g, '<a class="msg-trace-link" href="#" data-date="$1">📎 查看 $1 记录</a>')
    .replace(/\n/g, '<br>')
}

function handleContentClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.classList.contains('msg-trace-link')) {
    e.preventDefault()
    const date = target.getAttribute('data-date')
    if (date) {
      openTraceModal(date)
    }
  }
}

async function openTraceModal(date: string) {
  traceDate.value = date
  showTraceModal.value = true
  // 从 store 获取该日期的消息
  const { useSessionStore } = await import('../stores/session')
  const store = useSessionStore()
  const sessionId = store.currentSessionId
  if (!sessionId) {
    traceMessages.value = []
    return
  }
  const allMessages = await store.getMessagesByTimeRange(sessionId, 0, Date.now())
  const start = new Date(date).getTime()
  const end = start + 24 * 60 * 60 * 1000
  traceMessages.value = allMessages.filter((m: { timestamp: number }) => m.timestamp >= start && m.timestamp < end)
}

async function handleSend() {
  const content = inputValue.value.trim()
  if (!content || aiStore.isGenerating) return

  if (!modelConfig.activeSetting) {
    showConfigDialog.value = true
    return
  }

  inputValue.value = ''

  try {
    await aiStore.sendMessage(content, () => {
      nextTick(() => {
        scrollToBottom()
      })
    })
  } catch (err: any) {
    message.error(err.message)
  }
  nextTick(() => {
    scrollToBottom()
  })
}

function handleQuickQuestion(question: string) {
  if (!modelConfig.activeSetting) {
    showConfigDialog.value = true
    return
  }
  inputValue.value = question
  handleSend()
}

function scrollToBottom() {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight
  }
}

watch(() => aiStore.messages.length, () => {
  nextTick(scrollToBottom)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="ai-chat-view">
    <div class="chat-container" ref="chatContainer">
      <!-- 未配置提示 -->
      <div v-if="!modelConfig.hasAnyConfig" class="empty-state">
        <n-empty description="AI 关系分析师">
          <template #icon>
            <n-icon size="48" :component="SparklesOutline" />
          </template>
          <template #extra>
            <n-space vertical align="center">
              <n-text depth="2">请先配置 AI 模型</n-text>
              <n-button type="primary" @click="showConfigDialog = true">
                配置模型
              </n-button>
            </n-space>
          </template>
        </n-empty>
      </div>

      <!-- 空对话状态 -->
      <div v-else-if="aiStore.messages.length === 0" class="empty-state">
        <n-empty description="AI 关系分析师">
          <template #icon>
            <n-icon size="48" :component="SparklesOutline" />
          </template>
          <template #extra>
            <div class="quick-questions">
              <n-space style="margin-top: 12px" align="center" justify="center">
                <n-tag type="success" size="small">
                  当前: {{ aiStore.activeModelName }}
                </n-tag>
                <n-button text size="small" @click="showConfigDialog = true">
                  <n-icon :component="SettingsOutline" />
                  切换模型
                </n-button>
              </n-space>
              <n-text depth="2" style="display: block; margin-top: 16px">
                试试这些问题：
              </n-text>
              <n-space style="margin-top: 12px" wrap justify="center">
                <n-button
                  v-for="q in quickQuestions"
                  :key="q"
                  size="small"
                  @click="handleQuickQuestion(q)"
                >
                  {{ q }}
                </n-button>
              </n-space>
            </div>
          </template>
        </n-empty>
      </div>

      <!-- 消息列表 -->
      <div v-else class="messages">
        <div
          v-for="msg in aiStore.messages"
          :key="msg.id"
          class="message-row"
          :class="msg.role"
        >
          <n-avatar
            round
            size="small"
            :style="{
              background: msg.role === 'user' ? '#2080f0' : '#18a058',
            }"
          >
            <n-icon :component="msg.role === 'user' ? PersonOutline : SparklesOutline" />
          </n-avatar>
          <div class="message-bubble">
            <div
              class="message-content"
              v-html="formatMessageContent(msg.content)"
              @click="handleContentClick"
            />
            <n-spin v-if="msg.isStreaming" size="small" style="margin-top: 8px" />
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="input-area">
      <n-divider style="margin: 0 0 12px" />
      <n-space align="center" style="width: 100%">
        <n-button text size="small" @click="showConfigDialog = true" title="模型配置">
          <n-icon :component="SettingsOutline" />
        </n-button>
        <n-button
          text
          size="small"
          @click="aiStore.clearHistory"
          :disabled="aiStore.messages.length === 0"
        >
          <n-icon :component="TrashOutline" />
        </n-button>
        <n-input
          v-model:value="inputValue"
          type="textarea"
          placeholder="输入问题，AI 将基于你的聊天记录分析回答..."
          :autosize="{ minRows: 1, maxRows: 4 }"
          style="flex: 1"
          @keydown="handleKeydown"
        />
        <n-button
          type="primary"
          circle
          :disabled="!inputValue.trim() || aiStore.isGenerating"
          @click="handleSend"
        >
          <n-icon :component="SendOutline" />
        </n-button>
      </n-space>
      <div v-if="modelConfig.hasAnyConfig" class="model-indicator">
        <n-tag size="small" type="info">
          {{ aiStore.activeModelName }}
        </n-tag>
      </div>
    </div>

    <ModelConfigDialog v-model:show="showConfigDialog" />

    <!-- 消息溯源弹窗 -->
    <n-modal v-model:show="showTraceModal" :title="`${traceDate} 的聊天记录`" preset="card" style="width: 600px; max-width: 90vw">
      <n-timeline v-if="traceMessages.length > 0">
        <n-timeline-item
          v-for="m in traceMessages"
          :key="m.id"
          :type="m.isSelf ? 'success' : 'info'"
        >
          <template #header>
            <span style="font-weight: 500; font-size: 13px"
              >{{ m.isSelf ? '我' : '对方' }}</span
            >
            <span style="font-size: 12px; color: var(--text-muted); margin-left: 8px"
              >{{ new Date(m.timestamp).toLocaleTimeString('zh-CN') }}</span
            >
          </template>
          <div style="white-space: pre-wrap; word-break: break-word; line-height: 1.6"
            >{{ m.content }}</div
          >
        </n-timeline-item>
      </n-timeline>
      <n-empty v-else description="当天暂无消息" />
    </n-modal>
  </div>
</template>

<style scoped>
.ai-chat-view {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 48px);
  max-width: 900px;
  margin: 0 auto;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60%;
}

.quick-questions {
  text-align: center;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.message-row.user {
  flex-direction: row-reverse;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--card-bg);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message-row.user .message-bubble {
  background: var(--message-self-bg);
}

.message-row.assistant .message-bubble {
  background: var(--message-assistant-bg);
}

.message-content {
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-content :deep(.msg-trace-link) {
  display: inline-block;
  color: #2080f0;
  text-decoration: none;
  background: rgba(32, 128, 240, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  margin: 2px 0;
  transition: background 0.2s;
}

.message-content :deep(.msg-trace-link:hover) {
  background: rgba(32, 128, 240, 0.2);
  text-decoration: underline;
}

.input-area {
  padding: 0 24px 24px;
  background: #fff;
}

.model-indicator {
  margin-top: 8px;
  text-align: center;
}
</style>
