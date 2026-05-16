import type { ParseResult, RawMessage, RawParticipant } from '../types/message'

export async function parseGenericTxt(text: string, fileName: string): Promise<ParseResult> {
  const lines = text.split('\n').filter(l => l.trim())
  const messages: RawMessage[] = []

  // 尝试格式 A: "2024-03-15 10:23:15 张三\n在吗\n\n"
  // 尝试格式 B: "[2024-03-15 10:23:15] 张三: 在吗"
  // 尝试格式 C: "10:23 张三: 在吗"

  const patterns = [
    // 格式 A
    { date: /(\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}:\d{2})\s+(\S+)/, sep: true },
    // 格式 B
    { date: /\[(\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}:\d{2})\]\s+(\S+)[:：]/, sep: false },
    // 格式 C (仅时间)
    { date: /(\d{1,2}:\d{2})\s+(\S+)[:：]/, sep: false },
  ]

  let currentMessage: Partial<RawMessage> | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    let matched = false
    for (let pi = 0; pi < patterns.length; pi++) {
      const match = line.match(patterns[pi].date)
      if (match) {
        // 保存上一条消息
        if (currentMessage && currentMessage.content) {
          messages.push({
            id: `${fileName}-${messages.length}`,
            timestamp: currentMessage.timestamp || Date.now(),
            senderName: currentMessage.senderName || '未知',
            senderWxid: currentMessage.senderWxid,
            content: currentMessage.content || '',
            type: 'text',
          })
        }

        const dateStr = match[1]
        const senderName = match[2]
        let timestamp: number

        if (dateStr.includes('-')) {
          timestamp = new Date(dateStr).getTime()
        } else {
          // 只有时间，用今天
          const today = new Date()
          const [h, m] = dateStr.split(':').map(Number)
          today.setHours(h, m, 0, 0)
          timestamp = today.getTime()
        }

        const contentStart = line.indexOf(match[0]) + match[0].length
        const content = line.slice(contentStart).trim()

        currentMessage = {
          timestamp,
          senderName,
          content,
        }
        matched = true
        break
      }
    }

    if (!matched && currentMessage) {
      // 当前行是上一条消息的延续
      currentMessage.content = (currentMessage.content || '') + '\n' + line
    }
  }

  // 保存最后一条
  if (currentMessage && currentMessage.content) {
    messages.push({
      id: `${fileName}-${messages.length}`,
      timestamp: currentMessage.timestamp || Date.now(),
      senderName: currentMessage.senderName || '未知',
      senderWxid: currentMessage.senderWxid,
      content: currentMessage.content || '',
      type: 'text',
    })
  }

  const nameSet = new Set<string>()
  for (const m of messages) {
    if (m.senderName) nameSet.add(m.senderName)
  }
  const participants: RawParticipant[] = Array.from(nameSet).map(name => ({ name }))

  return {
    format: 'generic-txt',
    rawData: text,
    messages,
    participants,
    metadata: { fileName },
  }
}
