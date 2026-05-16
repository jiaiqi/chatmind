import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Alias } from '../types/identity'
import type { RawMessage } from '../types/message'

export const useIdentityStore = defineStore('identity', () => {
  // 用户确认的身份映射
  const confirmedMapping = ref<Map<string, 'self' | 'other'>>(new Map())
  const aliasHistory = ref<Alias[]>([])
  const inferredSelf = ref<string[]>([])

  const isIdentified = computed(() => {
    for (const [, role] of confirmedMapping.value) {
      if (role === 'self') return true
    }
    return false
  })

  const selfParticipant = computed(() => {
    for (const [key, role] of confirmedMapping.value) {
      if (role === 'self') return key
    }
    return null
  })

  function setRole(identifier: string, role: 'self' | 'other') {
    confirmedMapping.value.set(identifier, role)
  }

  function removeRole(identifier: string) {
    confirmedMapping.value.delete(identifier)
  }

  function addAlias(alias: Alias) {
    aliasHistory.value.push(alias)
  }

  function removeAlias(name: string) {
    aliasHistory.value = aliasHistory.value.filter(a => a.name !== name)
  }

  function getRole(identifier: string): 'self' | 'other' | 'unknown' {
    return confirmedMapping.value.get(identifier) || 'unknown'
  }

  // 核心函数：解析发送者身份
  function resolveSender(
    msg: RawMessage,
  ): 'self' | 'other' | 'unknown' {
    // 1. 优先用 wxid 匹配
    if (msg.senderWxid) {
      const role = confirmedMapping.value.get(msg.senderWxid)
      if (role) return role
    }

    // 2. 用当前昵称匹配
    const roleByName = confirmedMapping.value.get(msg.senderName)
    if (roleByName) return roleByName

    // 3. 用曾用名时间线匹配
    for (const alias of aliasHistory.value) {
      if (
        alias.name === msg.senderName &&
        msg.timestamp >= alias.startTime &&
        (!alias.endTime || msg.timestamp <= alias.endTime)
      ) {
        return 'self'
      }
    }

    // 4. 系统消息推断
    if (msg.type === 'system') {
      const selfIndicators = ['你已添加', '你邀请', '你修改', '你撤回', '你删除']
      if (selfIndicators.some(ind => msg.content.includes(ind))) {
        return 'self'
      }
    }

    // 5. 文件传输助手推断
    if (msg.senderName === '文件传输助手') {
      return 'other' // 文件传输助手不算对话方
    }

    return 'unknown'
  }

  function reset() {
    confirmedMapping.value.clear()
    aliasHistory.value = []
    inferredSelf.value = []
  }

  return {
    confirmedMapping,
    aliasHistory,
    inferredSelf,
    isIdentified,
    selfParticipant,
    setRole,
    removeRole,
    addAlias,
    removeAlias,
    getRole,
    resolveSender,
    reset,
  }
})
