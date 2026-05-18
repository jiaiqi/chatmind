import type { DbMessage } from '../db/schema'
import type { MediaTypeStat, MediaAnalysisResult } from '../types/analysis'
import type { MessageType } from '../types/message'

const TYPE_LABELS: Record<string, string> = {
  text: '文本',
  image: '图片',
  voice: '语音',
  video: '视频',
  file: '文件',
  location: '位置',
  link: '链接',
  system: '系统消息',
  transfer: '转账',
  redpacket: '红包',
  emoji: '表情',
  unknown: '其他',
}

export function analyzeMedia(messages: DbMessage[]): MediaAnalysisResult {
  if (messages.length === 0) {
    return {
      typeStats: [],
      selfMediaRatio: 0,
      otherMediaRatio: 0,
      totalMediaCount: 0,
      totalTextCount: 0,
    }
  }

  const typeMap = new Map<string, { self: number; other: number }>()

  for (const m of messages) {
    const type = m.type || 'text'
    const stat = typeMap.get(type) || { self: 0, other: 0 }
    if (m.isSelf) {
      stat.self++
    } else {
      stat.other++
    }
    typeMap.set(type, stat)
  }

  const typeStats: MediaTypeStat[] = []
  for (const [type, counts] of typeMap) {
    typeStats.push({
      type,
      label: TYPE_LABELS[type] || type,
      selfCount: counts.self,
      otherCount: counts.other,
      totalCount: counts.self + counts.other,
    })
  }

  typeStats.sort((a, b) => b.totalCount - a.totalCount)

  const selfTotal = messages.filter(m => m.isSelf).length
  const otherTotal = messages.filter(m => !m.isSelf).length
  const selfMedia = messages.filter(m => m.isSelf && m.type !== 'text').length
  const otherMedia = messages.filter(m => !m.isSelf && m.type !== 'text').length
  const totalMediaCount = messages.filter(m => m.type !== 'text').length
  const totalTextCount = messages.filter(m => m.type === 'text').length

  return {
    typeStats,
    selfMediaRatio: selfTotal > 0 ? selfMedia / selfTotal : 0,
    otherMediaRatio: otherTotal > 0 ? otherMedia / otherTotal : 0,
    totalMediaCount,
    totalTextCount,
  }
}
