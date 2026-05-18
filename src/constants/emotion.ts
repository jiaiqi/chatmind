import type { EmotionLabel } from '../types/message'

export interface EmotionMeta {
  key: EmotionLabel
  name: string
  emoji: string
  color: string
  isPositive: boolean
  isNegative: boolean
}

export const EMOTION_META: Record<EmotionLabel, EmotionMeta> = {
  positive: { key: 'positive', name: '正面', emoji: '😊', color: '#18a058', isPositive: true, isNegative: false },
  negative: { key: 'negative', name: '负面', emoji: '😟', color: '#d03050', isPositive: false, isNegative: true },
  neutral: { key: 'neutral', name: '中性', emoji: '😐', color: '#909399', isPositive: false, isNegative: false },
  angry: { key: 'angry', name: '愤怒', emoji: '😡', color: '#f56c6c', isPositive: false, isNegative: true },
  sad: { key: 'sad', name: '悲伤', emoji: '😢', color: '#8c8c8c', isPositive: false, isNegative: true },
  affectionate: { key: 'affectionate', name: '亲昵', emoji: '💕', color: '#e6a23c', isPositive: true, isNegative: false },
  indifferent: { key: 'indifferent', name: '敷衍', emoji: '🙄', color: '#c0c4cc', isPositive: false, isNegative: false },
}

export const EMOTION_COLORS: Record<EmotionLabel, string> = Object.fromEntries(
  Object.values(EMOTION_META).map(m => [m.key, m.color]),
) as Record<EmotionLabel, string>

export const EMOTION_LABELS: Record<EmotionLabel, string> = Object.fromEntries(
  Object.values(EMOTION_META).map(m => [m.key, `${m.emoji} ${m.name}`]),
) as Record<EmotionLabel, string>

export const EMOTION_EMOJIS: Record<EmotionLabel, string> = Object.fromEntries(
  Object.values(EMOTION_META).map(m => [m.key, m.emoji]),
) as Record<EmotionLabel, string>

export const POSITIVE_EMOTIONS: EmotionLabel[] = ['positive', 'affectionate']
export const NEGATIVE_EMOTIONS: EmotionLabel[] = ['negative', 'angry', 'sad']

export const ROLE_COLORS = {
  self: '#18a058',
  other: '#2080f0',
  warning: '#f0a020',
  danger: '#d03050',
} as const
