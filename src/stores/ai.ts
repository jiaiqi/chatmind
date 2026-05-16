import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AiClient } from '../ai/client'
import { useModelConfigStore } from './model-config'
import { useSessionStore } from './session'
import { calculateStatistics } from '../analyzers/statistics'
import { calculateEmotionTrend } from '../analyzers/emotion'
import { formatDate } from '../utils/date'
import type { AiMessage } from '../ai/client'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
}

export const useAiStore = defineStore('ai', () => {
  const sessionStore = useSessionStore()
  const modelConfig = useModelConfigStore()

  const messages = ref<ChatMessage[]>([])
  const isGenerating = ref(false)
  const error = ref<string | null>(null)

  const isConfigured = computed(() =>
    modelConfig.hasAnyConfig && !!modelConfig.activeSetting
  )

  const activeModelName = computed(() => {
    const model = modelConfig.activeModel
    const provider = modelConfig.activeProvider
    if (!model || !provider) return '未配置'
    return `${provider.name} / ${model.name}`
  })

  function clearHistory() {
    messages.value = []
  }

  function addMessage(msg: ChatMessage) {
    messages.value.push(msg)
  }

  // 构建系统提示词
  async function buildSystemPrompt(): Promise<string> {
    const session = sessionStore.currentSession
    if (!session) return ''

    const allMessages = await sessionStore.getMessagesByTimeRange(session.id, 0, Date.now())
    const stats = calculateStatistics(allMessages)
    const trend = calculateEmotionTrend(allMessages, 'week')

    const recentTrend = trend.slice(-4)
    const trendSummary = recentTrend.map(t =>
      `${t.date}: 我(😊${t.selfPositive} 😟${t.selfNegative}) 对方(😊${t.otherPositive} 😟${t.otherNegative})`
    ).join('\n')

    return `你是 ChatMind 的 AI 关系分析师。你正在分析一段微信聊天记录，基于客观数据给出洞察。

## 当前分析的数据概览
- 会话名称: ${session.name}
- 消息总数: ${stats.totalMessages}
- 我的消息: ${stats.selfMessages} (${(stats.selfRatio * 100).toFixed(1)}%)
- 对方消息: ${stats.otherMessages}
- 平均回复时间: ${formatDuration(stats.avgReplyDelay)}
- 时间跨度: ${formatDate(session.timeRange[0])} 至 ${formatDate(session.timeRange[1])}

## 最近情绪趋势
${trendSummary}

## 分析原则
1. 基于数据说话，不凭空臆测
2. 温和表达，即使是负面发现也要建设性
3. 平衡视角，同时分析双方的互动模式
4. 用中文回答，简洁清晰

你可以回答用户关于这段关系的任何问题，如情绪分析、沟通模式、潜在问题、改善建议等。`
  }

  async function sendMessage(userContent: string, onChunk?: (chunk: string) => void) {
    error.value = null

    const aiConfig = modelConfig.getAiConfig()
    if (!aiConfig) {
      throw new Error('请先配置 AI 模型')
    }

    const client = new AiClient({
      baseUrl: aiConfig.baseUrl,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      extraHeaders: aiConfig.extraHeaders,
      provider: aiConfig.provider,
    })

    const systemPrompt = await buildSystemPrompt()
    const history: AiMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.value.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userContent },
    ]

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userContent,
    }
    addMessage(userMsg)

    const assistantMsg: ChatMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: '',
      isStreaming: true,
    }
    addMessage(assistantMsg)
    isGenerating.value = true

    try {
      for await (const chunk of client.chatStream(history)) {
        assistantMsg.content += chunk
        onChunk?.(chunk)
      }
      assistantMsg.isStreaming = false
    } catch (err: any) {
      assistantMsg.content = `出错了: ${err.message}`
      assistantMsg.isStreaming = false
      error.value = err.message
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  return {
    messages,
    isGenerating,
    error,
    isConfigured,
    activeModelName,
    clearHistory,
    addMessage,
    sendMessage,
  }
})

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时`
  const days = Math.floor(hours / 24)
  return `${days}天`
}
