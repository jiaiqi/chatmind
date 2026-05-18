import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AiClient } from '../ai/client'
import { useModelConfigStore } from './model-config'
import { useSessionStore } from './session'
import { calculateStatistics } from '../analyzers/statistics'
import { calculateEmotionTrend } from '../analyzers/emotion'
import { formatDate } from '../utils/date'
import { buildToolsPrompt, buildAiToolDefinitions } from '../ai/tools/definitions'
import { ToolExecutor, parseToolCalls, stripToolCalls, formatToolResults, formatToolResultsAsMessages, toolCallToToolCall } from '../ai/tools/executor'
import type { AiMessage, AiToolCall } from '../ai/client'

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
  async function buildSystemPrompt(useFC = false): Promise<string> {
    const session = sessionStore.currentSession
    if (!session) return ''

    const allMessages = await sessionStore.getMessagesByTimeRange(session.id, 0, Date.now())
    const stats = calculateStatistics(allMessages)
    const trend = calculateEmotionTrend(allMessages, 'week')

    const recentTrend = trend.slice(-4)
    const trendSummary = recentTrend.map(t =>
      `${t.date}: 我(😊${t.selfPositive} 😟${t.selfNegative}) 对方(😊${t.otherPositive} 😟${t.otherNegative})`
    ).join('\n')

    let toolsSection = ''
    if (!useFC) {
      toolsSection = buildToolsPrompt()
    }

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
5. 当你引用具体日期的聊天记录时，使用格式 [MSG:YYYY-MM-DD]，这样用户可以点击跳转到当天的对话。例如："3月15日你们有一次争执 [MSG:2024-03-15]"

你可以回答用户关于这段关系的任何问题，如情绪分析、沟通模式、潜在问题、改善建议等。

${toolsSection}`
  }

  async function sendMessage(userContent: string, onChunk?: (chunk: string) => void) {
    error.value = null

    const aiConfig = modelConfig.getAiConfig()
    if (!aiConfig) {
      throw new Error('请先配置 AI 模型')
    }

    const useFC = aiConfig.supportsFunctionCalling

    const client = new AiClient({
      baseUrl: aiConfig.baseUrl,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
      extraHeaders: aiConfig.extraHeaders,
      provider: aiConfig.provider,
      supportsFunctionCalling: useFC,
    })

    const systemPrompt = await buildSystemPrompt(useFC)
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
      if (useFC) {
        await sendMessageWithFC(client, history, assistantMsg, onChunk)
      } else {
        await sendMessageWithTextMarker(client, history, assistantMsg, onChunk)
      }
    } catch (err: any) {
      assistantMsg.content = `出错了: ${err.message}`
      assistantMsg.isStreaming = false
      error.value = err.message
      throw err
    } finally {
      isGenerating.value = false
    }
  }

  async function sendMessageWithFC(
    client: AiClient,
    history: AiMessage[],
    assistantMsg: ChatMessage,
    onChunk?: (chunk: string) => void,
  ) {
    const tools = buildAiToolDefinitions()
    const session = sessionStore.currentSession
    const executor = new ToolExecutor(session!.id)

    let currentHistory = [...history]
    const maxRounds = 5

    for (let round = 0; round < maxRounds; round++) {
      let contentAcc = ''
      const toolCalls: AiToolCall[] = []

      for await (const event of client.chatStream(currentHistory, tools)) {
        if (event.type === 'content' && event.content) {
          contentAcc += event.content
          assistantMsg.content = contentAcc
          onChunk?.(event.content)
        } else if (event.type === 'tool_call' && event.toolCall) {
          toolCalls.push(event.toolCall)
        }
      }

      if (toolCalls.length === 0) {
        assistantMsg.isStreaming = false
        return
      }

      assistantMsg.content = contentAcc || '正在查询相关数据...'

      const toolCallInputs = toolCalls.map(tc => toolCallToToolCall(tc))
      const results = await Promise.all(toolCallInputs.map(c => executor.execute(c)))

      const toolMessages = formatToolResultsAsMessages(toolCalls, results)
      currentHistory = [...currentHistory, ...toolMessages]

      assistantMsg.content = contentAcc
      assistantMsg.isStreaming = true
    }

    assistantMsg.isStreaming = false
  }

  async function sendMessageWithTextMarker(
    client: AiClient,
    history: AiMessage[],
    assistantMsg: ChatMessage,
    onChunk?: (chunk: string) => void,
  ) {
    let firstResponse = ''
    for await (const event of client.chatStream(history)) {
      if (event.type === 'content' && event.content) {
        firstResponse += event.content
        if (!firstResponse.includes('[TOOL_CALL:')) {
          assistantMsg.content = firstResponse
          onChunk?.(event.content)
        }
      }
    }

    const toolCalls = parseToolCalls(firstResponse)

    if (toolCalls.length > 0) {
      assistantMsg.content = '正在查询相关数据...'

      const session = sessionStore.currentSession
      const executor = new ToolExecutor(session!.id)
      const results = await Promise.all(toolCalls.map(c => executor.execute(c)))

      const toolResultText = formatToolResults(results)
      const secondHistory: AiMessage[] = [
        ...history,
        { role: 'assistant', content: firstResponse },
        { role: 'user', content: `以下是工具查询结果，请基于这些真实数据继续回答用户的问题（不要编造数据）：\n${toolResultText}` },
      ]

      assistantMsg.content = ''
      assistantMsg.isStreaming = true
      for await (const event of client.chatStream(secondHistory)) {
        if (event.type === 'content' && event.content) {
          assistantMsg.content += event.content
          onChunk?.(event.content)
        }
      }
      assistantMsg.isStreaming = false
    } else {
      assistantMsg.content = stripToolCalls(firstResponse)
      assistantMsg.isStreaming = false
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
