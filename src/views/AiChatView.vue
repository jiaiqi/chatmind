<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import {
  NCard, NInput, NButton, NSpace, NEmpty,
  NAvatar, NSpin, NDivider, NIcon,
  NForm, NFormItem, NSelect, useMessage,
} from 'naive-ui'
import { SparklesOutline, SendOutline, TrashOutline, PersonOutline } from '@vicons/ionicons5'
import { useAiStore } from '../stores/ai'

const aiStore = useAiStore()
const message = useMessage()

const inputValue = ref('')
const chatContainer = ref<HTMLDivElement | null>(null)
const showConfig = ref(false)

const quickQuestions = [
  '最近我们的关系怎么样？',
  '谁在这段关系里更主动？',
  '有什么需要注意的问题吗？',
  '我们的沟通模式有什么特点？',
  '怎么改善我们的关系？',
]

const modelOptions = [
  { label: 'DeepSeek V3', value: 'deepseek-chat' },
  { label: 'DeepSeek R1', value: 'deepseek-reasoner' },
]

async function handleSend() {
  const content = inputValue.value.trim()
  if (!content || aiStore.isGenerating) return

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
      <!-- 配置面板 -->
      <n-card v-if="!aiStore.isConfigured || showConfig" size="small" class="config-card">
        <template #header>
          <n-space align="center">
            <n-icon :component="SparklesOutline" />
            <span>AI 配置</span>
          </n-space>
        </template>
        <n-form label-placement="left" label-width="80">
          <n-form-item label="API Key">
            <n-input
              v-model:value="aiStore.config.apiKey"
              type="password"
              placeholder="输入你的 DeepSeek API Key"
              show-password-on="mousedown"
              @blur="aiStore.setApiKey(aiStore.config.apiKey)"
            />
          </n-form-item>
          <n-form-item label="模型">
            <n-select
              v-model:value="aiStore.config.model"
              :options="modelOptions"
              @update:value="aiStore.setModel"
            />
          </n-form-item>
        </n-form>
        <n-text depth="3" style="font-size: 12px">
          数据仅用于调用 AI API，不会上传到我们的服务器。
          <a href="https://platform.deepseek.com/" target="_blank">获取 DeepSeek API Key</a>
        </n-text>
      </n-card>

      <!-- 空状态 -->
      <div v-if="aiStore.messages.length === 0" class="empty-state">
        <n-empty description="AI 关系分析师">
          <template #icon>
            <n-icon size="48" :component="SparklesOutline" />
          </template>
          <template #extra>
            <div class="quick-questions">
              <n-text depth="2">试试这些问题：</n-text>
              <n-space style="margin-top: 12px" wrap>
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
        <n-button text size="small" @click="showConfig = !showConfig">
          <n-icon :component="SparklesOutline" />
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
          :disabled="!inputValue.trim() || aiStore.isGenerating || !aiStore.isConfigured"
          @click="handleSend"
        >
          <n-icon :component="SendOutline" />
        </n-button>
      </n-space>
    </div>
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

.config-card {
  margin-bottom: 16px;
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
</style>
