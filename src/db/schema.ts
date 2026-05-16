import Dexie, { type Table } from 'dexie'
import type { EmotionLabel, MessageType } from '../types/message'

export interface DbMessage {
  id: string
  sessionId: string
  senderId: string
  isSelf: boolean
  timestamp: number
  content: string
  type: MessageType
  emotion?: EmotionLabel
  emotionScore?: number
  emotionMethod?: 'rule' | 'user'
  wordCount: number
}

export interface DbParticipant {
  id: string
  sessionId: string
  wxid?: string
  names: string[]
  role: 'self' | 'other' | 'unknown'
  messageCount: number
  firstSeen: number
  lastSeen: number
}

export interface DbSession {
  id: string
  name: string
  type: 'private' | 'group'
  participantIds: string[]
  importedAt: number
  messageCount: number
  timeRange: [number, number]
  sourceFormat: string
  sourceFileName: string
}

export class ChatMindDB extends Dexie {
  messages!: Table<DbMessage>
  participants!: Table<DbParticipant>
  sessions!: Table<DbSession>

  constructor() {
    super('ChatMindDB')
    this.version(1).stores({
      messages: 'id, [sessionId+timestamp], senderId, timestamp, emotion',
      participants: 'id, [sessionId+names], role',
      sessions: 'id, importedAt',
    })
  }
}

export const db = new ChatMindDB()
