import Papa from 'papaparse'
import type { ParseResult, RawMessage, RawParticipant } from '../types/message'

export async function parseWeFlowCsv(text: string, fileName: string): Promise<ParseResult> {
  const result = Papa.parse<any>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase(),
  })

  if (result.errors.length > 0 && result.errors.some(e => e.type === 'Delimiter')) {
    throw new Error('CSV 解析失败: ' + result.errors[0].message)
  }

  const messages: RawMessage[] = result.data.map((row: any, index: number) => {
    let timestamp: number
    const tsValue = row.timestamp || row.time || row.date || row['发送时间']
    if (typeof tsValue === 'number') {
      timestamp = tsValue > 1000000000000 ? tsValue : tsValue * 1000
    } else if (typeof tsValue === 'string') {
      timestamp = new Date(tsValue).getTime() || Date.now()
    } else {
      timestamp = Date.now()
    }

    return {
      id: `${fileName}-${index}`,
      timestamp,
      senderName: row.sendername || row.sender_name || row.sender || row['发送者'] || row.nickname || '未知',
      senderWxid: row.senderwxid || row.sender_wxid || row.wxid,
      content: row.content || row.message || row.text || row['内容'] || '',
      type: mapType(row.type || row['类型']),
    }
  }).filter(m => m.content || m.type !== 'unknown')

  const nameSet = new Set<string>()
  for (const m of messages) {
    if (m.senderName) nameSet.add(m.senderName)
  }
  const participants: RawParticipant[] = Array.from(nameSet).map(name => ({ name }))

  return {
    format: 'weflow-csv',
    rawData: result.data,
    messages,
    participants,
    metadata: { fileName },
  }
}

function mapType(type?: string): RawMessage['type'] {
  if (!type) return 'text'
  const lower = type.toLowerCase().trim()
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
    '文本': 'text',
    '图片': 'image',
    '语音': 'voice',
    '视频': 'video',
    '文件': 'file',
    '位置': 'location',
    '链接': 'link',
    '系统': 'system',
  }
  return map[lower] || 'text'
}
