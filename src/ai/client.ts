export interface AiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  tool_calls?: AiToolCall[]
}

export interface AiToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface AiToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, any>
  }
}

export interface AiRequestConfig {
  baseUrl: string
  apiKey: string
  model: string
  extraHeaders?: Record<string, string>
  provider?: string
  supportsFunctionCalling?: boolean
}

export interface AiClientOptions {
  timeout?: number
  retries?: number
}

export interface StreamEvent {
  type: 'content' | 'tool_call' | 'done'
  content?: string
  toolCall?: AiToolCall
}

export class AiClient {
  private timeout: number
  private retries: number

  constructor(
    private config: AiRequestConfig,
    options: AiClientOptions = {},
  ) {
    this.timeout = options.timeout ?? 30000
    this.retries = options.retries ?? 1
  }

  get supportsFunctionCalling(): boolean {
    return this.config.supportsFunctionCalling ?? false
  }

  async *chatStream(messages: AiMessage[], tools?: AiToolDefinition[]): AsyncGenerator<StreamEvent> {
    const body = this.buildRequestBody(messages, tools)
    const headers = this.buildHeaders()

    const response = await this.fetchWithRetry(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const reader = response.body?.getReader()
    if (!reader) throw new Error('无法读取响应')

    const decoder = new TextDecoder()
    let buffer = ''

    const toolCallAccumulators = new Map<number, { id: string; name: string; arguments: string }>()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed === 'data: [DONE]') continue
        if (!trimmed.startsWith('data: ')) continue

        try {
          const data = JSON.parse(trimmed.slice(6))
          const choice = data.choices?.[0]
          if (!choice) continue

          const delta = choice.delta
          if (delta?.content) {
            yield { type: 'content', content: delta.content }
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0
              if (!toolCallAccumulators.has(idx)) {
                toolCallAccumulators.set(idx, {
                  id: tc.id || '',
                  name: tc.function?.name || '',
                  arguments: '',
                })
              }
              const acc = toolCallAccumulators.get(idx)!
              if (tc.id) acc.id = tc.id
              if (tc.function?.name) acc.name = tc.function.name
              if (tc.function?.arguments) acc.arguments += tc.function.arguments
            }
          }

          if (choice.finish_reason === 'tool_calls') {
            for (const [, acc] of toolCallAccumulators) {
              yield {
                type: 'tool_call',
                toolCall: {
                  id: acc.id,
                  type: 'function',
                  function: {
                    name: acc.name,
                    arguments: acc.arguments,
                  },
                },
              }
            }
            toolCallAccumulators.clear()
          }
        } catch {
          // ignore parse error
        }
      }
    }

    yield { type: 'done' }
  }

  private async fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (response.status >= 400 && response.status < 500) {
          const errText = await response.text()
          throw new Error(`API 请求失败 (${response.status}): ${errText}`)
        }

        if (!response.ok) {
          throw new Error(`API 请求失败 (${response.status})`)
        }

        return response
      } catch (err) {
        clearTimeout(timeoutId)

        if (err instanceof Error && err.name === 'AbortError') {
          lastError = new Error(`请求超时（${this.timeout / 1000}秒），请检查网络或稍后重试`)
        } else {
          lastError = err instanceof Error ? err : new Error(String(err))
        }

        if (err instanceof Error && err.message.startsWith('API 请求失败 (4')) {
          throw lastError
        }

        if (attempt < this.retries) {
          await this.delay(1000 * (attempt + 1))
          continue
        }
      }
    }

    throw lastError ?? new Error('请求失败')
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async chat(messages: AiMessage[], tools?: AiToolDefinition[]): Promise<string> {
    let result = ''
    for await (const event of this.chatStream(messages, tools)) {
      if (event.type === 'content' && event.content) {
        result += event.content
      }
    }
    return result
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Ollama 不需要 API Key
    if (this.config.provider !== 'ollama' && this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    // 合并额外 headers
    if (this.config.extraHeaders) {
      for (const [key, value] of Object.entries(this.config.extraHeaders)) {
        const resolved = value.replace('{apiKey}', this.config.apiKey)
        headers[key] = resolved
      }
    }

    return headers
  }

  private buildRequestBody(messages: AiMessage[], tools?: AiToolDefinition[]) {
    const body: Record<string, any> = {
      model: this.config.model,
      messages,
      stream: true,
      temperature: 0.7,
    }

    if (this.supportsFunctionCalling && tools && tools.length > 0) {
      body.tools = tools
    }

    return body
  }
}
