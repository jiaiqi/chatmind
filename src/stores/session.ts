import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../db/schema'
import type { DbMessage, DbParticipant, DbSession, DbEvent } from '../db/schema'
import type { EmotionLabel } from '../types/message'

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
    method: 'rule' | 'user' = 'user',
  ) {
    await db.messages.update(messageId, { emotion, emotionScore: score, emotionMethod: method })
  }

  async function updateMessageIdentity(messageId: string, isSelf: boolean) {
    await db.messages.update(messageId, { isSelf })
  }

  async function batchUpdateIdentityBySender(
    sessionId: string,
    senderId: string,
    isSelf: boolean,
  ) {
    const msgs = await db.messages
      .where('sessionId')
      .equals(sessionId)
      .and(m => m.senderId === senderId)
      .toArray()

    const ids = msgs.map(m => m.id)
    if (ids.length === 0) return 0

    await db.messages.bulkUpdate(
      ids.map(id => ({ key: id, changes: { isSelf } })),
    )

    return ids.length
  }

  async function getParticipants(sessionId: string) {
    return db.participants.where('sessionId').equals(sessionId).toArray()
  }

  async function getEvents(sessionId: string) {
    return db.events.where('sessionId').equals(sessionId).sortBy('date')
  }

  async function addEvent(event: Omit<DbEvent, 'id' | 'createdAt'>) {
    const newEvent: DbEvent = {
      ...event,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }
    await db.events.put(newEvent)
    return newEvent
  }

  async function deleteEvent(eventId: string) {
    await db.events.delete(eventId)
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
    updateMessageIdentity,
    batchUpdateIdentityBySender,
    getParticipants,
    getEvents,
    addEvent,
    deleteEvent,
    setCurrentSession,
  }
})
