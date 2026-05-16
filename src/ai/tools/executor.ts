import { db } from '../../db/schema'
import { calculateEmotionTrend } from '../../analyzers/emotion'
import { calculateStatistics } from '../../analyzers/statistics'
import { calculateWordFrequency } from '../../analyzers/word-frequency'
import { trackKeyword } from '../../analyzers/keyword-track'
import { sanitizeText } from '../sanitizer'

export interface ToolCall {
  tool: string
  args: Record<string, any>
}

export interface ToolResult {
  tool: string
  args: Record<string, any>
  result: any
  error?: string
}

export class ToolExecutor {
  constructor(private sessionId: string) {}

  async execute(call: ToolCall): Promise<ToolResult> {
    try {
      const result = await this.runTool(call.tool, call.args)
      return { tool: call.tool, args: call.args, result }
    } catch (err: any) {
      return { tool: call.tool, args: call.args, result: null, error: err.message }
    }
  }

  private async runTool(name: string, args: Record<string, any>): Promise<any> {
    switch (name) {
      case 'query_messages':
        return this.queryMessages(args)
      case 'query_emotion_trend':
        return this.queryEmotionTrend(args)
      case 'query_statistics':
        return this.queryStatistics(args)
      case 'search_keywords':
        return this.searchKeywords(args)
      default:
        throw new Error(`未知工具: ${name}`)
    }
  }

  private async queryMessages(args: any) {
    const { startDate, endDate, sender = 'any', keyword, limit = 20 } = args

    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 // 包含整天

    let messages = await db.messages
      .where('[sessionId+timestamp]')
      .between([this.sessionId, start], [this.sessionId, end])
      .sortBy('timestamp')

    if (sender && sender !== 'any') {
      messages = messages.filter(m => m.isSelf === (sender === 'self'))
    }

    if (keyword) {
      const kw = keyword.toLowerCase()
      messages = messages.filter(m => m.content.toLowerCase().includes(kw))
    }

    messages = messages.slice(0, Math.min(limit, 100))

    return messages.map(m => ({
      time: new Date(m.timestamp).toISOString().slice(0, 10),
      sender: m.isSelf ? '用户A' : '用户B',
      content: sanitizeText(m.content, { truncateLength: 200 }),
      emotion: m.emotion,
    }))
  }

  private async queryEmotionTrend(args: any) {
    const { startDate, endDate, granularity = 'day' } = args

    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000

    const messages = await db.messages
      .where('[sessionId+timestamp]')
      .between([this.sessionId, start], [this.sessionId, end])
      .sortBy('timestamp')

    const trend = calculateEmotionTrend(messages, granularity)

    return trend.slice(-30).map((d: any) => ({
      date: d.date,
      selfPositive: d.selfPositive,
      selfNegative: d.selfNegative,
      otherPositive: d.otherPositive,
      otherNegative: d.otherNegative,
    }))
  }

  private async queryStatistics(args: any) {
    const { metric, startDate, endDate } = args

    const start = startDate ? new Date(startDate).getTime() : 0
    const end = endDate ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 : Date.now()

    const messages = await db.messages
      .where('[sessionId+timestamp]')
      .between([this.sessionId, start], [this.sessionId, end])
      .sortBy('timestamp')

    const stats = calculateStatistics(messages)

    switch (metric) {
      case 'message_count':
        return {
          total: stats.totalMessages,
          self: stats.selfMessages,
          other: stats.otherMessages,
          selfRatio: (stats.selfRatio * 100).toFixed(1) + '%',
        }
      case 'reply_delay':
        return {
          avgSelfDelayMs: stats.avgSelfReplyDelay,
          avgOtherDelayMs: stats.avgOtherReplyDelay,
          avgSelfDelay: this.formatDuration(stats.avgSelfReplyDelay),
          avgOtherDelay: this.formatDuration(stats.avgOtherReplyDelay),
        }
      case 'active_hours':
        return {
          peakHour: stats.hourlyDistribution.indexOf(Math.max(...stats.hourlyDistribution)),
          hourlyDistribution: stats.hourlyDistribution,
        }
      case 'word_freq':
        const { allWords } = calculateWordFrequency(messages, 20)
        return { topWords: allWords.map(w => ({ word: w.word, count: w.count })) }
      case 'initiation_ratio':
        // 简化计算：第一条消息视为发起
        return { selfRatio: (stats.selfRatio * 100).toFixed(1) + '%' }
      case 'length_trend':
        return {
          avgLength: (messages.reduce((s, m) => s + (m.wordCount || 0), 0) / messages.length).toFixed(1),
        }
      default:
        return stats
    }
  }

  private async searchKeywords(args: any) {
    const { keywords } = args
    if (!Array.isArray(keywords) || keywords.length === 0) {
      return []
    }

    const messages = await db.messages
      .where('sessionId')
      .equals(this.sessionId)
      .sortBy('timestamp')

    const results: any[] = []
    for (const keyword of keywords.slice(0, 5)) {
      const { matches } = trackKeyword(messages, keyword)
      results.push({
        keyword,
        count: matches.length,
        samples: matches.slice(0, 5).map(m => ({
          time: new Date(m.message.timestamp).toISOString().slice(0, 10),
          sender: m.message.isSelf ? '用户A' : '用户B',
          content: sanitizeText(m.message.content, { truncateLength: 150 }),
        })),
      })
    }

    return results
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}秒`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}分钟`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时`
    const days = Math.floor(hours / 24)
    return `${days}天`
  }
}

export function parseToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = []
  const regex = /\[TOOL_CALL:\s*({.*?})\]/gs
  let match
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      if (parsed.tool && parsed.args) {
        calls.push({ tool: parsed.tool, args: parsed.args })
      }
    } catch {
      // ignore parse error
    }
  }
  return calls
}

export function stripToolCalls(text: string): string {
  return text.replace(/\[TOOL_CALL:\s*{.*?}\]\s*/gs, '').trim()
}

export function formatToolResults(results: ToolResult[]): string {
  if (results.length === 0) return ''
  const lines = results.map(r => {
    if (r.error) {
      return `[TOOL_RESULT: {"tool": "${r.tool}", "error": "${r.error}"}]`
    }
    return `[TOOL_RESULT: {"tool": "${r.tool}", "result": ${JSON.stringify(r.result)}}]`
  })
  return lines.join('\n')
}
