<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import {
  NInput, NButton, NSpace, NEmpty,
  NAvatar, NSpin, NDivider, NIcon,
  NTag, useMessage,
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

const quickQuestions = [
  '最近我们的关系怎么样？',
  '谁在这段关系里更主动？',
  '有什么需要注意的问题吗？',
  '我们的沟通模式有什么特点？',
  '怎么改善我们的关系？',
]

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
            <div class="message-content" v-html="msg.content.replace(/\n/g, '<br>')" />
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
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.message-row.user .message-bubble {
  background: #e6f7ff;
}

.message-row.assistant .message-bubble {
  background: #f6ffed;
}

.message-content {
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
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
