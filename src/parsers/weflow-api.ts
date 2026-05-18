import type { ParseResult, RawMessage, RawParticipant } from '../types/message'

export interface WeFlowApiConfig {
  baseUrl: string
}

export async function checkWeFlowApi(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/api/sessions`, { signal: AbortSignal.timeout(5000) })
    return res.ok
  } catch {
    return false
  }
}

export async function fetchWeFlowSessions(baseUrl: string): Promise<any[]> {
  const res = await fetch(`${baseUrl}/api/sessions`)
  if (!res.ok) throw new Error(`获取会话列表失败 (${res.status})`)
  const data = await res.json()
  return Array.isArray(data) ? data : data.sessions || data.data || []
}

export async function fetchWeFlowMessages(
  baseUrl: string,
  sessionId: string,
): Promise<ParseResult> {
  const res = await fetch(`${baseUrl}/api/sessions/${sessionId}/messages`)
  if (!res.ok) throw new Error(`获取消息失败 (${res.status})`)
  const data = await res.json()

  const rawMessages = Array.isArray(data) ? data : data.messages || data.data || []

  const messages: RawMessage[] = rawMessages.map((m: any, index: number) => {
    let timestamp: number
    if (typeof m.timestamp === 'number') {
      timestamp = m.timestamp > 1e12 ? m.timestamp : m.timestamp * 1000
    } else {
      timestamp = new Date(m.timestamp || m.time || Date.now()).getTime()
    }

    return {
      id: m.id || `weflow-api-${sessionId}-${index}`,
      timestamp,
      senderName: m.senderName || m.sender || m.nickname || '未知',
      senderWxid: m.senderWxid || m.wxid,
      content: m.content || m.message || m.text || '',
      type: mapType(m.type),
    }
  })

  const nameSet = new Map<string, string | undefined>()
  for (const m of rawMessages) {
    const name = m.senderName || m.sender || m.nickname
    const wxid = m.senderWxid || m.wxid
    if (name && !nameSet.has(name)) {
      nameSet.set(name, wxid)
    }
  }

  const participants: RawParticipant[] = Array.from(nameSet.entries()).map(([name, wxid]) => ({
    name,
    wxid,
  }))

  const sessionName = data.sessionName || data.name || sessionId

  return {
    format: 'weflow-api',
    rawData: { sessionId, messageCount: messages.length },
    messages,
    participants,
    metadata: {
      fileName: sessionName,
      source: 'weflow-api',
    },
  }
}

function mapType(type?: string | number): RawMessage['type'] {
  if (!type) return 'text'
  if (typeof type === 'number') {
    const numMap: Record<number, RawMessage['type']> = {
      0: 'text', 1: 'image', 2: 'voice', 3: 'video',
      4: 'file', 5: 'emoji', 7: 'link', 8: 'location',
      20: 'redpacket', 21: 'transfer', 80: 'system', 99: 'unknown',
    }
    return numMap[type] || 'text'
  }
  const strMap: Record<string, RawMessage['type']> = {
    text: 'text', image: 'image', voice: 'voice', video: 'video',
    file: 'file', emoji: 'emoji', link: 'link', location: 'location',
    system: 'system', transfer: 'transfer', redpacket: 'redpacket',
  }
  return strMap[type.toLowerCase()] || 'text'
}
