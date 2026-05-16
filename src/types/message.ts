export type MessageType =
  | 'text'
  | 'image'
  | 'voice'
  | 'video'
  | 'file'
  | 'location'
  | 'link'
  | 'system'
  | 'transfer'
  | 'redpacket'
  | 'emoji'
  | 'unknown'

export type EmotionLabel =
  | 'positive'
  | 'negative'
  | 'neutral'
  | 'angry'
  | 'sad'
  | 'affectionate'
  | 'indifferent'

export interface Message {
  id: string
  sessionId: string
  senderId: string
  isSelf: boolean
  timestamp: number
  content: string
  type: MessageType
  emotion?: EmotionLabel
  emotionScore?: number
  wordCount: number
  raw?: Record<string, any>
}

export interface RawMessage {
  id?: string
  timestamp: number
  senderName: string
  senderWxid?: string
  content: string
  type: MessageType
}

export interface RawParticipant {
  name: string
  wxid?: string
  remarkName?: string
  isSystem?: boolean
}

export interface ParseResult<T = any> {
  format: string
  rawData: T
  messages: RawMessage[]
  participants: RawParticipant[]
  metadata: {
    fileName: string
    exportTime?: string
    source?: string
    version?: string
  }
}
