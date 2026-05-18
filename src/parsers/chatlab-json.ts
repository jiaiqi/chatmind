import type { ParseResult, RawMessage, RawParticipant } from '../types/message'

const CHATLAB_TYPE_MAP: Record<number, RawMessage['type']> = {
  0: 'text',
  1: 'image',
  2: 'voice',
  3: 'video',
  4: 'file',
  5: 'emoji',
  7: 'link',
  8: 'location',
  20: 'redpacket',
  21: 'transfer',
  80: 'system',
  99: 'unknown',
}

function mapChatLabType(type: number | string | undefined): RawMessage['type'] {
  if (type === undefined) return 'text'
  const num = typeof type === 'number' ? type : parseInt(type, 10)
  return CHATLAB_TYPE_MAP[num] || 'text'
}

export async function parseChatLabJson(text: string, fileName: string): Promise<ParseResult> {
  let data: any

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('ChatLab JSON 解析失败，请检查文件格式')
  }

  if (!data.messages || !Array.isArray(data.messages)) {
    throw new Error('ChatLab 格式缺少 messages 字段')
  }

  const messages: RawMessage[] = data.messages.map((m: any, index: number) => {
    let timestamp: number
    if (typeof m.timestamp === 'number') {
      timestamp = m.timestamp > 1e12 ? m.timestamp : m.timestamp * 1000
    } else {
      timestamp = new Date(m.timestamp || m.time || m.date || Date.now()).getTime()
    }

    return {
      id: m.id || `${fileName}-cl-${index}`,
      timestamp,
      senderName: m.sender || m.senderName || m.nickname || m.name || '未知',
      senderWxid: m.senderId || m.senderWxid || m.wxid,
      content: m.content || m.message || m.text || '',
      type: mapChatLabType(m.type),
    }
  })

  const participants: RawParticipant[] = []

  if (data.participants && Array.isArray(data.participants)) {
    for (const p of data.participants) {
      participants.push({
        name: p.displayName || p.name || p.nickname || '未知',
        wxid: p.id || p.wxid,
        remarkName: p.remarkName || p.remark,
        isSystem: p.isSystem || p.role === 'system' || false,
      })
    }
  }

  if (participants.length === 0) {
    const nameSet = new Map<string, string | undefined>()
    for (const m of data.messages) {
      const name = m.sender || m.senderName || m.nickname || m.name
      const wxid = m.senderId || m.senderWxid || m.wxid
      if (name && !nameSet.has(name)) {
        nameSet.set(name, wxid)
      }
    }
    for (const [name, wxid] of nameSet) {
      participants.push({ name, wxid })
    }
  }

  return {
    format: 'chatlab-json',
    rawData: data,
    messages,
    participants,
    metadata: {
      fileName,
      exportTime: data.exportTime || data.export_time || data.createdAt,
      source: data.source || 'chatlab',
      version: data.version || data.formatVersion,
    },
  }
}

export async function parseChatLabJsonl(text: string, fileName: string): Promise<ParseResult> {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length === 0) {
    throw new Error('ChatLab JSONL 文件为空')
  }

  const messages: RawMessage[] = []
  const nameSet = new Map<string, string | undefined>()
  let metadata: any = {}

  for (let i = 0; i < lines.length; i++) {
    try {
      const obj = JSON.parse(lines[i])

      if (obj.type === 'metadata' || obj.formatVersion) {
        metadata = obj
        continue
      }

      if (!obj.content && !obj.message && !obj.text) continue

      let timestamp: number
      if (typeof obj.timestamp === 'number') {
        timestamp = obj.timestamp > 1e12 ? obj.timestamp : obj.timestamp * 1000
      } else {
        timestamp = new Date(obj.timestamp || obj.time || obj.date || Date.now()).getTime()
      }

      const senderName = obj.sender || obj.senderName || obj.nickname || obj.name || '未知'
      const wxid = obj.senderId || obj.senderWxid || obj.wxid

      if (!nameSet.has(senderName)) {
        nameSet.set(senderName, wxid)
      }

      messages.push({
        id: obj.id || `${fileName}-cll-${i}`,
        timestamp,
        senderName,
        senderWxid: wxid,
        content: obj.content || obj.message || obj.text || '',
        type: mapChatLabType(obj.type),
      })
    } catch {
      continue
    }
  }

  const participants: RawParticipant[] = Array.from(nameSet.entries()).map(([name, wxid]) => ({
    name,
    wxid,
  }))

  return {
    format: 'chatlab-jsonl',
    rawData: { metadata, messageCount: messages.length },
    messages,
    participants,
    metadata: {
      fileName,
      exportTime: metadata.exportTime || metadata.export_time || metadata.createdAt,
      source: metadata.source || 'chatlab',
      version: metadata.version || metadata.formatVersion,
    },
  }
}
