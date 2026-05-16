<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import {
  NCard, NList, NListItem, NThing, NPagination,
  NTag, NEmpty, NSpace, NSelect, useMessage, NPopover,
  NDropdown, NButton, NIcon, NModal,
} from 'naive-ui'
import { EllipsisHorizontalOutline } from '@vicons/ionicons5'
import { useSessionStore } from '../stores/session'
import { db } from '../db/schema'
import { formatDateTime } from '../utils/date'
import type { DbMessage } from '../db/schema'
import type { EmotionLabel } from '../types/message'

const sessionStore = useSessionStore()
const message = useMessage()

const messages = ref<DbMessage[]>([])
const currentPage = ref(1)
const pageSize = ref(50)
const totalCount = ref(0)
const filterEmotion = ref<string | null>(null)
const filterSender = ref<string | null>(null)

const pageCount = computed(() => Math.ceil(totalCount.value / pageSize.value))

const emotionColors: Record<EmotionLabel, string> = {
  positive: '#18a058',
  negative: '#d03050',
  neutral: '#909399',
  angry: '#f56c6c',
  sad: '#909399',
  affectionate: '#e6a23c',
  indifferent: '#c0c4cc',
}

const emotionLabels: Record<string, string> = {
  positive: '😊 正面',
  negative: '😟 负面',
  neutral: '😐 中性',
  angry: '😡 愤怒',
  sad: '😢 悲伤',
  affectionate: '💕 亲昵',
  indifferent: '🙄 敷衍',
}

const emotionFullLabels: Record<string, string> = {
  positive: '😊 正面',
  negative: '😟 负面',
  neutral: '😐 中性',
  angry: '😡 愤怒',
  sad: '😢 悲伤',
  affectionate: '💕 亲昵',
  indifferent: '🙄 敷衍',
}

const allEmotions: EmotionLabel[] = ['positive', 'negative', 'neutral', 'angry', 'sad', 'affectionate', 'indifferent']
const correctingMsgId = ref<string | null>(null)
const showBatchModal = ref(false)
const batchSenderId = ref('')
const batchSenderName = ref('')
const batchTargetIsSelf = ref(true)

const senderOptions = computed(() => [
  { label: '全部', value: '' },
  { label: '我', value: 'self' },
  { label: '对方', value: 'other' },
])

const emotionOptions = computed(() => [
  { label: '全部情绪', value: '' },
  ...Object.entries(emotionLabels).map(([key, label]) => ({ label, value: key })),
])

async function loadMessages() {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId) return

  try {
    totalCount.value = await sessionStore.getMessageCount(sessionId)

    let query = db.messages
      .where('sessionId')
      .equals(sessionId)

    if (filterEmotion.value) {
      query = query.and(m => m.emotion === filterEmotion.value)
    }

    if (filterSender.value !== null && filterSender.value !== '') {
      const isSelf = filterSender.value === 'self'
      query = query.and(m => m.isSelf === isSelf)
    }

    const offset = (currentPage.value - 1) * pageSize.value
    messages.value = await query
      .offset(offset)
      .limit(pageSize.value)
      .sortBy('timestamp')
  } catch (err) {
    message.error('加载消息失败')
  }
}

watch(() => sessionStore.currentSessionId, () => {
  currentPage.value = 1
  loadMessages()
})
watch([currentPage, filterEmotion, filterSender], loadMessages)
onMounted(loadMessages)

function getEmotionTag(emotion?: EmotionLabel) {
  if (!emotion) return null
  return {
    label: emotionLabels[emotion] || emotion,
    color: emotionColors[emotion] || '#909399',
  }
}

async function handleEmotionChange(msgId: string, newEmotion: EmotionLabel) {
  correctingMsgId.value = null
  try {
    await sessionStore.updateMessageEmotion(msgId, newEmotion, 0.95, 'user')
    const msg = messages.value.find(m => m.id === msgId)
    if (msg) {
      msg.emotion = newEmotion
      msg.emotionScore = 0.95
      msg.emotionMethod = 'user'
    }
    message.success('情绪标签已更新')
  } catch {
    message.error('更新失败')
  }
}

async function handleIdentityChange(msgId: string, isSelf: boolean) {
  try {
    await sessionStore.updateMessageIdentity(msgId, isSelf)
    const msg = messages.value.find(m => m.id === msgId)
    if (msg) {
      msg.isSelf = isSelf
    }
    message.success(`已标记为${isSelf ? '我的' : '对方的'}消息`)
  } catch {
    message.error('更新失败')
  }
}

function openBatchModal(senderId: string, senderName: string, isSelf: boolean) {
  batchSenderId.value = senderId
  batchSenderName.value = senderName
  batchTargetIsSelf.value = isSelf
  showBatchModal.value = true
}

async function confirmBatchUpdate() {
  const sessionId = sessionStore.currentSessionId
  if (!sessionId) return
  try {
    const count = await sessionStore.batchUpdateIdentityBySender(
      sessionId,
      batchSenderId.value,
      batchTargetIsSelf.value,
    )
    message.success(`已批量修正 ${count} 条消息`)
    showBatchModal.value = false
    loadMessages()
  } catch {
    message.error('批量修正失败')
  }
}

function getIdentityOptions(msg: DbMessage) {
  const oppositeLabel = msg.isSelf ? '标记为对方的消息' : '标记为我的消息'
  const oppositeValue = !msg.isSelf
  const batchLabel = msg.isSelf
    ? `将「${msg.senderId}」所有消息归给对方`
    : `将「${msg.senderId}」所有消息归给我`
  return [
    { label: oppositeLabel, key: `switch-${msg.id}` },
    { label: batchLabel, key: `batch-${msg.senderId}-${oppositeValue}` },
  ]
}

function handleIdentitySelect(key: string, msg: DbMessage) {
  if (key.startsWith('switch-')) {
    handleIdentityChange(msg.id, !msg.isSelf)
  } else if (key.startsWith('batch-')) {
    const parts = key.split('-')
    const isSelf = parts[parts.length - 1] === 'true'
    openBatchModal(msg.senderId, msg.senderId, isSelf)
  }
}
</script>

<template>
  <div class="message-list-view">
    <n-card title="聊天记录">
      <template #header-extra>
        <n-space>
          <n-select
            v-model:value="filterSender"
            :options="senderOptions"
            placeholder="发送者"
            style="width: 120px"
            clearable
          />
          <n-select
            v-model:value="filterEmotion"
            :options="emotionOptions"
            placeholder="情绪"
            style="width: 140px"
            clearable
          />
        </n-space>
      </template>

      <n-list v-if="messages.length > 0">
        <n-list-item v-for="msg in messages" :key="msg.id">
          <n-thing>
            <template #header>
              <n-space align="center" size="small">
                <n-tag
                  :type="msg.isSelf ? 'success' : 'info'"
                  size="small"
                >
                  {{ msg.isSelf ? '我' : '对方' }}
                </n-tag>
                <span class="msg-time">{{ formatDateTime(msg.timestamp) }}</span>
                <n-popover
                  trigger="click"
                  placement="bottom"
                  :show="correctingMsgId === msg.id"
                  @update:show="(v: boolean) => { if (!v) correctingMsgId = null }"
                >
                  <template #trigger>
                    <n-tag
                      v-if="getEmotionTag(msg.emotion)"
                      size="small"
                      :color="{ textColor: getEmotionTag(msg.emotion)?.color, borderColor: getEmotionTag(msg.emotion)?.color }"
                      style="cursor: pointer"
                      @click="correctingMsgId = msg.id"
                    >
                      {{ getEmotionTag(msg.emotion)?.label }}
                      <span v-if="msg.emotionMethod === 'user'" style="opacity: 0.6; margin-left: 2px">✎</span>
                    </n-tag>
                  </template>
                  <div class="emotion-picker">
                    <div class="emotion-picker-title">修正情绪标签</div>
                    <div class="emotion-picker-grid">
                      <n-button
                        v-for="emo in allEmotions"
                        :key="emo"
                        size="small"
                        :type="msg.emotion === emo ? 'primary' : 'default'"
                        @click="handleEmotionChange(msg.id, emo)"
                      >
                        {{ emotionFullLabels[emo] }}
                      </n-button>
                    </div>
                  </div>
                </n-popover>
                <n-dropdown
                  :options="getIdentityOptions(msg)"
                  @select="(key: string) => handleIdentitySelect(key, msg)"
                  placement="bottom-end"
                  trigger="click"
                >
                  <n-button text size="tiny" style="margin-left: 4px">
                    <n-icon :component="EllipsisHorizontalOutline" />
                  </n-button>
                </n-dropdown>
              </n-space>
            </template>
            <template #description>
              <div class="msg-content">{{ msg.content }}</div>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>

      <n-empty v-else description="暂无消息" />

      <div class="pagination" v-if="pageCount > 1">
        <n-pagination
          v-model:page="currentPage"
          :page-count="pageCount"
          :page-size="pageSize"
        />
      </div>
    </n-card>

    <!-- 批量修正确认弹窗 -->
    <n-modal
      v-model:show="showBatchModal"
      title="批量修正身份"
      preset="dialog"
      positive-text="确认"
      negative-text="取消"
      @positive-click="confirmBatchUpdate"
    >
      <n-alert type="warning" title="注意" style="margin-bottom: 12px"
      >
        此操作将修改该发送者的所有消息身份，且无法撤销。
      </n-alert>
      <p>
        是否将发送者 <strong>「{{ batchSenderName }}」</strong> 的所有消息标记为
        <strong>{{ batchTargetIsSelf ? '我的消息' : '对方的消息' }}</strong>？
      </p>
    </n-modal>
  </div>
</template>

<style scoped>
.message-list-view {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.msg-time {
  font-size: 12px;
  color: var(--text-muted);
}

.msg-content {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
  padding: 8px 0;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.emotion-picker {
  padding: 8px;
  min-width: 200px;
}

.emotion-picker-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-color);
}

.emotion-picker-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}
</style>
