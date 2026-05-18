import { db } from '../db/schema'
import type { DbMessage, DbParticipant, DbSession, DbEvent } from '../db/schema'

interface BackupData {
  version: number
  exportedAt: number
  sessions: DbSession[]
  messages: DbMessage[]
  participants: DbParticipant[]
  events: DbEvent[]
}

export async function exportBackup(): Promise<string> {
  const [sessions, messages, participants, events] = await Promise.all([
    db.sessions.toArray(),
    db.messages.toArray(),
    db.participants.toArray(),
    db.events.toArray(),
  ])

  const data: BackupData = {
    version: 1,
    exportedAt: Date.now(),
    sessions,
    messages,
    participants,
    events,
  }

  return JSON.stringify(data, null, 2)
}

export async function importBackup(jsonString: string): Promise<{ sessions: number; messages: number }> {
  const data: BackupData = JSON.parse(jsonString)

  if (!data.version || !data.sessions || !data.messages) {
    throw new Error('无效的备份文件格式')
  }

  await db.transaction('rw', [db.sessions, db.messages, db.participants, db.events], async () => {
    await db.sessions.bulkPut(data.sessions)
    await db.messages.bulkPut(data.messages)
    if (data.participants) await db.participants.bulkPut(data.participants)
    if (data.events) await db.events.bulkPut(data.events)
  })

  return {
    sessions: data.sessions.length,
    messages: data.messages.length,
  }
}

export function downloadBackupFile(content: string, filename?: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || `chatmind-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function readBackupFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file)
  })
}
