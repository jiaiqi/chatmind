export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiRequestConfig {
  baseUrl: string
  apiKey: string
  model: string
  extraHeaders?: Record<string, string>
  provider?: string
}

export interface AiClientOptions {
  timeout?: number
  retries?: number
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

  async *chatStream(messages: AiMessage[]): AsyncGenerator<string> {
    const body = this.buildRequestBody(messages)
    const headers = this.buildHeaders()

    const response = await this.fetchWithRetry(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`API 请求失败 (${response.status}): ${err}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('无法读取响应')

    const decoder = new TextDecoder()
    let buffer = ''

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
          const content = data.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {
          // ignore parse error
        }
      }
    }
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
        return response
      } catch (err) {
        clearTimeout(timeoutId)

        // 超时错误转换为用户友好提示
        if (err instanceof Error && err.name === 'AbortError') {
          lastError = new Error(`请求超时（${this.timeout / 1000}秒），请检查网络或稍后重试`)
        } else {
          lastError = err instanceof Error ? err : new Error(String(err))
        }

        // 不重试客户端错误（4xx）
        if (err instanceof Response && err.status >= 400 && err.status < 500) {
          throw lastError
        }

        // 超时或网络错误，且还有重试次数
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

  async chat(messages: AiMessage[]): Promise<string> {
    let result = ''
    for await (const chunk of this.chatStream(messages)) {
      result += chunk
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

  private buildRequestBody(messages: AiMessage[]) {
    const body: Record<string, any> = {
      model: this.config.model,
      messages,
      stream: true,
      temperature: 0.7,
    }

    // MiniMax 特殊处理：使用 messages 格式稍有不同
    if (this.config.provider === 'minimax') {
      // MiniMax 支持标准格式，不需要特殊转换
    }

    // 百炼特殊处理：支持标准 OpenAI 格式
    if (this.config.provider === 'bailian') {
      // 百炼的 compatible-mode 完全兼容 OpenAI
    }

    // 智谱特殊处理
    if (this.config.provider === 'zhipu') {
      // 智谱也兼容 OpenAI 格式
    }

    return body
  }
}
