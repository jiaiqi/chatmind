export interface AiMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AiConfig {
  provider: 'deepseek' | 'openai' | 'custom'
  baseUrl: string
  apiKey: string
  model: string
}

export class AiClient {
  constructor(private config: AiConfig) {}

  async *chatStream(messages: AiMessage[]): AsyncGenerator<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: true,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`API 请求失败: ${err}`)
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

  async chat(messages: AiMessage[]): Promise<string> {
    let result = ''
    for await (const chunk of this.chatStream(messages)) {
      result += chunk
    }
    return result
  }
}
