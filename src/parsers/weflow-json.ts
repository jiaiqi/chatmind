import type { ParseResult, RawMessage, RawParticipant } from '../types/message'

export async function parseWeFlowJson(text: string, fileName: string): Promise<ParseResult> {
  let data: any

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('JSON 解析失败，请检查文件格式')
  }

  // 支持 WeFlow 标准格式
  if (data.messages && Array.isArray(data.messages)) {
    const messages: RawMessage[] = data.messages.map((m: any, index: number) => ({
      id: m.id || `${fileName}-${index}`,
      timestamp: typeof m.timestamp === 'number' ? m.timestamp * 1000 : new Date(m.timestamp).getTime(),
      senderName: m.senderName || m.sender_name || m.nickname || '未知',
      senderWxid: m.senderWxid || m.sender_wxid || m.wxid,
      content: m.content || m.message || '',
      type: mapMessageType(m.type),
    }))

    const participants: RawParticipant[] = (data.participants || []).map((p: any) => ({
      name: p.displayName || p.name || p.nickname || '未知',
      wxid: p.wxid,
      remarkName: p.remarkName,
      isSystem: p.isSystem || false,
    }))

    // 如果没有 participants，从消息中提取
    if (participants.length === 0) {
      const nameSet = new Set<string>()
      for (const m of messages) {
        if (m.senderName) nameSet.add(m.senderName)
      }
      for (const name of nameSet) {
        participants.push({ name, isSystem: name === '系统消息' })
      }
    }

    return {
      format: 'weflow-json',
      rawData: data,
      messages,
      participants,
      metadata: {
        fileName,
        exportTime: data.exportTime || data.export_time,
        source: data.source || 'weflow',
        version: data.version,
      },
    }
  }

  // 支持简单数组格式
  if (Array.isArray(data)) {
    const messages: RawMessage[] = data.map((m: any, index: number) => ({
      id: `${fileName}-${index}`,
      timestamp: typeof m.timestamp === 'number' ? m.timestamp * 1000 : new Date(m.timestamp || Date.now()).getTime(),
      senderName: m.senderName || m.sender || m.nickname || m.name || '未知',
      senderWxid: m.senderWxid || m.wxid,
      content: m.content || m.message || m.text || '',
      type: mapMessageType(m.type),
    }))

    const nameSet = new Set<string>()
    for (const m of messages) {
      if (m.senderName) nameSet.add(m.senderName)
    }
    const participants: RawParticipant[] = Array.from(nameSet).map(name => ({ name }))

    return {
      format: 'json-array',
      rawData: data,
      messages,
      participants,
      metadata: { fileName },
    }
  }

  throw new Error('无法识别的 JSON 格式')
}

function mapMessageType(type?: string): RawMessage['type'] {
  if (!type) return 'text'
  const map: Record<string, RawMessage['type']> = {
    text: 'text',
    image: 'image',
    voice: 'voice',
    video: 'video',
    file: 'file',
    location: 'location',
    link: 'link',
    system: 'system',
    transfer: 'transfer',
    redpacket: 'redpacket',
    emoji: 'emoji',
    unknown: 'unknown',
  }
  return map[type.toLowerCase()] || 'text'
}
