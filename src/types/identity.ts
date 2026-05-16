export interface Alias {
  name: string
  startTime: number
  endTime?: number
}

export interface Participant {
  id: string
  wxid?: string
  names: string[]
  role: 'self' | 'other' | 'unknown'
  messageCount: number
  firstSeen: number
  lastSeen: number
}

export interface IdentityGraph {
  self: {
    participantId: string
    primaryWxid?: string
    currentNickname: string
    aliases: Alias[]
  } | null
  participants: Participant[]
  nameToRole: Map<string, 'self' | 'other'>
  wxidToRole: Map<string, 'self' | 'other'>
}
