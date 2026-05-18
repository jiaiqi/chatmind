import type { EmotionLabel } from '../types/message'

export interface EmotionRule {
  words: string[]
  label: EmotionLabel
  weight: number
}

const POSITIVE_WORDS = [
  '开心', '高兴', '喜欢', '爱你', '谢谢', '哈哈', '嘿嘿', '棒', '赞',
  '优秀', '厉害', '漂亮', '可爱', '舒服', '顺利', '完美', '幸福', '满足',
  '期待', '想你了', '么么哒', '比心', '❤️', '😊', '😄', '😆', '🥰', '😍',
  '👍', '💕', '💖', '🎉', '✨', '🌹', '😘', '🤗', '666', '牛',
  '好的', '好呀', '好哒', '好哦', '好嘞', '太好', '好开心', '好喜欢',
  '好棒', '好厉害', '好可爱', '好幸福', '好甜', '真好', '最好',
]

const NEGATIVE_WORDS = [
  '烦', '讨厌', '失望', '难过', '伤心', '累', '糟糕', '郁闷', '无语',
  '嫌弃', '后悔', '担心', '焦虑', '压力', '委屈', '痛苦', '折磨',
  '😔', '😞', '😟', '😤', '😫', '😩', '😢', '😭', '💔',
  '好烦', '好累', '好难过', '好讨厌', '好失望', '好气', '好无语',
  '好烦人', '好恶心', '好难受', '好委屈', '好痛苦', '好伤心',
]

const INTENSIFIER_NEGATIVE_PATTERNS = [
  /好烦/, /好累/, /好讨厌/, /好失望/, /好气/, /好无语/,
  /好难受/, /好委屈/, /好痛苦/, /好伤心/, /好恶心/, /好烦人/,
  /太烦/, /太累/, /太讨厌/, /太失望/, /太气/, /太无语/,
  /真烦/, /真累/, /真讨厌/, /真失望/, /真气/, /真无语/,
  /特别烦/, /特别累/, /特别讨厌/, /特别失望/,
]

const ANGRY_WORDS = [
  '滚', '操', '他妈', '有病', '傻逼', '恶心', '去死', '烦死了',
  '气死我了', '恨你', '够了', '闭嘴', '别说了', '毁灭吧',
  '😡', '🤬', '👿', '💢',
]

const SAD_WORDS = [
  ' sad', '哭', '泪', '伤心', '心痛', '失落', '孤独', '空虚',
  '被抛弃', '不重要', '无所谓了', '就这样吧',
  '😥', '😰', '😓', '😣', '☹️', '🙁',
]

const AFFECTIONATE_WORDS = [
  '想你', '爱你', '抱抱', '亲亲', '宝贝', '亲爱的', '老婆', '老公',
  '晚安', '早安', '注意安全', '记得吃饭', '多穿点', '别熬夜',
  '🥺', '🤭', '😳', '☺️',
]

const INDIFFERENT_WORDS = [
  '知道了', '行', '随便', '都可以',
  '随你', '你决定', '哦哦', '…', '......',
  '😐', '🙄', '😶', '👌',
]

const PERFUNCTORY_PATTERNS = [
  /^嗯{1,2}$/,
  /^哦{1,2}$/,
  /^好{1,2}$/,
  /^行{1,2}$/,
  /^知道了?$/,
  /^随便$/,
  /^都可以$/,
  /^嗯嗯嗯+$/,
]

export function ruleBasedEmotion(text: string): { label: EmotionLabel; score: number } | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  for (const pattern of PERFUNCTORY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { label: 'indifferent', score: 0.7 }
    }
  }

  for (const pattern of INTENSIFIER_NEGATIVE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { label: 'negative', score: 0.8 }
    }
  }

  let matched = false
  let matchedLabel: EmotionLabel = 'neutral'
  let maxWeight = 0

  const rules: { words: string[]; label: EmotionLabel; weight: number }[] = [
    { words: ANGRY_WORDS, label: 'angry', weight: 3 },
    { words: AFFECTIONATE_WORDS, label: 'affectionate', weight: 2 },
    { words: SAD_WORDS, label: 'sad', weight: 2 },
    { words: INDIFFERENT_WORDS, label: 'indifferent', weight: 1.5 },
    { words: POSITIVE_WORDS, label: 'positive', weight: 1 },
    { words: NEGATIVE_WORDS, label: 'negative', weight: 1.5 },
  ]

  for (const rule of rules) {
    for (const word of rule.words) {
      if (text.includes(word)) {
        matched = true
        const weight = text.split(word).length - 1
        const totalWeight = weight * rule.weight
        if (totalWeight > maxWeight) {
          maxWeight = totalWeight
          matchedLabel = rule.label
        }
      }
    }
  }

  if (!matched) return null

  const finalScore = Math.min(maxWeight * 0.3 + 0.5, 0.95)
  return { label: matchedLabel, score: finalScore }
}

// 表情到情绪的映射
export function emojiToEmotion(emoji: string): EmotionLabel | null {
  const emojiMap: Record<string, EmotionLabel> = {
    '😊': 'positive', '😄': 'positive', '😆': 'positive', '🤣': 'positive',
    '🥰': 'affectionate', '😍': 'affectionate', '😘': 'affectionate',
    '❤️': 'affectionate', '💕': 'affectionate', '💖': 'affectionate',
    '😔': 'negative', '😞': 'negative', '😟': 'negative', '😤': 'angry',
    '😫': 'negative', '😩': 'negative', '😢': 'sad', '😭': 'sad',
    '😡': 'angry', '🤬': 'angry', '💢': 'angry', '💔': 'sad',
    '🙄': 'indifferent', '😐': 'indifferent', '😶': 'indifferent',
    '👍': 'positive', '🎉': 'positive', '✨': 'positive',
  }
  return emojiMap[emoji] || null
}
