import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../db/schema'
import type { DbMessage, DbParticipant, DbSession } from '../db/schema'
import type { EmotionLabel, MessageType } from '../types/message'

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<DbSession[]>([])
  const currentSessionId = ref<string | null>(null)
  const isLoading = ref(false)

  const currentSession = computed(() =>
    sessions.value.find(s => s.id === currentSessionId.value) || null,
  )

  async function loadSessions() {
    sessions.value = await db.sessions.toArray()
    if (sessions.value.length > 0 && !currentSessionId.value) {
      currentSessionId.value = sessions.value[0].id
    }
  }

  async function createSession(data: {
    id: string
    name: string
    type: 'private' | 'group'
    participantIds: string[]
    messageCount: number
    timeRange: [number, number]
    sourceFormat: string
    sourceFileName: string
  }) {
    const session: DbSession = {
      ...data,
      importedAt: Date.now(),
    }
    await db.sessions.put(session)
    sessions.value.push(session)
    currentSessionId.value = session.id
    return session
  }

  async function deleteSession(sessionId: string) {
    await db.sessions.delete(sessionId)
    await db.messages.where('sessionId').equals(sessionId).delete()
    await db.participants.where('sessionId').equals(sessionId).delete()
    sessions.value = sessions.value.filter(s => s.id !== sessionId)
    if (currentSessionId.value === sessionId) {
      currentSessionId.value = sessions.value[0]?.id || null
    }
  }

  async function addMessages(messages: DbMessage[]) {
    if (messages.length === 0) return
    await db.messages.bulkPut(messages)
  }

  async function addParticipants(participants: DbParticipant[]) {
    if (participants.length === 0) return
    await db.participants.bulkPut(participants)
  }

  async function getMessages(sessionId: string, limit = 100, offset = 0) {
    return db.messages
      .where('sessionId')
      .equals(sessionId)
      .offset(offset)
      .limit(limit)
      .sortBy('timestamp')
  }

  async function getMessagesByTimeRange(
    sessionId: string,
    start: number,
    end: number,
  ) {
    return db.messages
      .where('[sessionId+timestamp]')
      .between([sessionId, start], [sessionId, end])
      .sortBy('timestamp')
  }

  async function getMessageCount(sessionId: string) {
    return db.messages.where('sessionId').equals(sessionId).count()
  }

  async function updateMessageEmotion(
    messageId: string,
    emotion: EmotionLabel,
    score: number,
  ) {
    await db.messages.update(messageId, { emotion, emotionScore: score })
  }

  async function getParticipants(sessionId: string) {
    return db.participants.where('sessionId').equals(sessionId).toArray()
  }

  function setCurrentSession(id: string) {
    currentSessionId.value = id
  }

  return {
    sessions,
    currentSessionId,
    currentSession,
    isLoading,
    loadSessions,
    createSession,
    deleteSession,
    addMessages,
    addParticipants,
    getMessages,
    getMessagesByTimeRange,
    getMessageCount,
    updateMessageEmotion,
    getParticipants,
    setCurrentSession,
  }
})
