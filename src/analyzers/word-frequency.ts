import type { DbMessage } from '../db/schema'

// 中文分词（简单规则）
function tokenizeChinese(text: string): string[] {
  const words: string[] = []
  const len = text.length
  let i = 0

  while (i < len) {
    const ch = text[i]
    // 跳过标点、空格、数字
    if (/[\s\d\p{P}]/u.test(ch)) {
      i++
      continue
    }

    // 连续的中文字符作为一个词（2-4字）
    if (/[一-龥]/.test(ch)) {
      let word = ch
      let j = i + 1
      while (j < len && j < i + 4 && /[一-龥]/.test(text[j])) {
        word += text[j]
        j++
      }
      words.push(word)
      i++
      continue
    }

    // 英文单词
    if (/[a-zA-Z]/.test(ch)) {
      let word = ch
      let j = i + 1
      while (j < len && /[a-zA-Z]/.test(text[j])) {
        word += text[j]
        j++
      }
      words.push(word.toLowerCase())
      i = j
      continue
    }

    i++
  }

  return words
}

const STOP_WORDS = new Set([
  '的', '了', '是', '我', '你', '在', '和', '就', '不', '人', '有', '都', '一个', '上', '也',
  '很', '到', '说', '要', '去', '会', '着', '没有', '看', '好', '自己', '这', '那', '吗',
  '呢', '吧', '啊', '哦', '嗯', '啦', '哈', '什么', '怎么', '还是', '就是', '可以', '这个',
  '那个', '但是', '因为', '所以', '如果', '虽然', '不过', '然后', '现在', '今天', '明天',
  '昨天', '时候', '知道', '觉得', '感觉', '想', '觉得', '觉得', '一下', '一直', '一起',
  '已经', '开始', '需要', '应该', '可能', '一定', '比较', '特别', '非常', '真的', '太',
  '又', '还', '把', '被', '让', '给', '对', '向', '从', '与', '及', '等', '或', '但',
  '而', '因', '于', '以', '为', '之', '其', '这', '那', '个', '些', '样', '种', '么',
])

export interface WordFreq {
  word: string
  count: number
  isSelf: boolean
}

export function calculateWordFrequency(messages: DbMessage[], topN = 50): {
  selfWords: WordFreq[]
  otherWords: WordFreq[]
  allWords: WordFreq[]
} {
  const selfFreq = new Map<string, number>()
  const otherFreq = new Map<string, number>()

  for (const msg of messages) {
    if (msg.type !== 'text' || !msg.content) continue

    const words = tokenizeChinese(msg.content)
    const target = msg.isSelf ? selfFreq : otherFreq

    for (const word of words) {
      if (word.length < 2) continue
      if (STOP_WORDS.has(word)) continue
      target.set(word, (target.get(word) || 0) + 1)
    }
  }

  const selfWords = Array.from(selfFreq.entries())
    .map(([word, count]) => ({ word, count, isSelf: true }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)

  const otherWords = Array.from(otherFreq.entries())
    .map(([word, count]) => ({ word, count, isSelf: false }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)

  const allFreq = new Map<string, { count: number; isSelf: boolean }>()
  for (const [word, count] of selfFreq) {
    allFreq.set(word, { count, isSelf: true })
  }
  for (const [word, count] of otherFreq) {
    const existing = allFreq.get(word)
    if (existing) {
      existing.count += count
    } else {
      allFreq.set(word, { count, isSelf: false })
    }
  }

  const allWords = Array.from(allFreq.entries())
    .map(([word, { count, isSelf }]) => ({ word, count, isSelf }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN)

  return { selfWords, otherWords, allWords }
}

export function calculateReplyDelayDistribution(messages: DbMessage[]): {
  delays: { range: string; selfDelay: number; otherDelay: number }[]
  avgSelfDelay: number
  avgOtherDelay: number
} {
  const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp)
  const selfDelays: number[] = []
  const otherDelays: number[] = []

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (prev.isSelf !== curr.isSelf) {
      const delay = curr.timestamp - prev.timestamp
      if (delay < 24 * 60 * 60 * 1000) {
        if (curr.isSelf) {
          selfDelays.push(delay)
        } else {
          otherDelays.push(delay)
        }
      }
    }
  }

  // 分桶
  const buckets = [
    { max: 60 * 1000, label: '< 1分钟' },
    { max: 5 * 60 * 1000, label: '1-5分钟' },
    { max: 15 * 60 * 1000, label: '5-15分钟' },
    { max: 60 * 60 * 1000, label: '15-60分钟' },
    { max: 4 * 60 * 60 * 1000, label: '1-4小时' },
    { max: 24 * 60 * 60 * 1000, label: '4-24小时' },
  ]

  const delays = buckets.map(b => ({
    range: b.label,
    selfDelay: selfDelays.filter(d => {
      const prevMax = buckets[buckets.indexOf(b) - 1]?.max || 0
      return d > prevMax && d <= b.max
    }).length,
    otherDelay: otherDelays.filter(d => {
      const prevMax = buckets[buckets.indexOf(b) - 1]?.max || 0
      return d > prevMax && d <= b.max
    }).length,
  }))

  return {
    delays,
    avgSelfDelay: selfDelays.length > 0 ? selfDelays.reduce((a, b) => a + b, 0) / selfDelays.length : 0,
    avgOtherDelay: otherDelays.length > 0 ? otherDelays.reduce((a, b) => a + b, 0) / otherDelays.length : 0,
  }
}

export function calculateMessageLengthTrend(messages: DbMessage[]): {
  dates: string[]
  selfLengths: (number | null)[]
  otherLengths: (number | null)[]
} {
  const groups = new Map<string, { self: number[]; other: number[] }>()

  for (const msg of messages) {
    if (msg.type !== 'text') continue
    const date = new Date(msg.timestamp).toISOString().slice(0, 10)
    const g = groups.get(date) || { self: [], other: [] }
    if (msg.isSelf) {
      g.self.push(msg.wordCount)
    } else {
      g.other.push(msg.wordCount)
    }
    groups.set(date, g)
  }

  const sortedDates = Array.from(groups.keys()).sort()

  return {
    dates: sortedDates,
    selfLengths: sortedDates.map(d => {
      const arr = groups.get(d)!.self
      return arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
    }),
    otherLengths: sortedDates.map(d => {
      const arr = groups.get(d)!.other
      return arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null
    }),
  }
}

export function calculateCalendarData(messages: DbMessage[]): {
  date: string
  count: number
  intensity: number
}[] {
  const groups = new Map<string, number>()

  for (const msg of messages) {
    const date = new Date(msg.timestamp).toISOString().slice(0, 10)
    groups.set(date, (groups.get(date) || 0) + 1)
  }

  const maxCount = Math.max(...groups.values(), 1)

  return Array.from(groups.entries())
    .map(([date, count]) => ({
      date,
      count,
      intensity: Math.round((count / maxCount) * 100),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function calculateEmotionDistribution(messages: DbMessage[]): {
  self: Record<string, number>
  other: Record<string, number>
} {
  const result = {
    self: {} as Record<string, number>,
    other: {} as Record<string, number>,
  }

  const emotions = ['positive', 'negative', 'neutral', 'angry', 'sad', 'affectionate', 'indifferent']
  for (const e of emotions) {
    result.self[e] = 0
    result.other[e] = 0
  }

  for (const msg of messages) {
    const emotion = msg.emotion || 'neutral'
    if (msg.isSelf) {
      result.self[emotion] = (result.self[emotion] || 0) + 1
    } else {
      result.other[emotion] = (result.other[emotion] || 0) + 1
    }
  }

  return result
}
