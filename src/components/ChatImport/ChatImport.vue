<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NUpload, NUploadDragger, NText, NIcon, NButton, NInput, NCollapse, NCollapseItem, useMessage } from 'naive-ui'
import { ArchiveOutline as ArchiveIcon, PlayOutline, CloudDownloadOutline } from '@vicons/ionicons5'
import { useImportStore } from '../../stores/import'
import { useIdentityStore } from '../../stores/identity'
import { useSessionStore } from '../../stores/session'
import { parseFile } from '../../parsers'
import { checkWeFlowApi, fetchWeFlowSessions, fetchWeFlowMessages } from '../../parsers/weflow-api'
import { analyzeBatchEmotion } from '../../analyzers/emotion'
import { generateDemoMessages, getDemoParticipants } from '../../utils/demo-data'

const importStore = useImportStore()
const identityStore = useIdentityStore()
const sessionStore = useSessionStore()
const message = useMessage()
const router = useRouter()

const isDragging = ref(false)
const weflowUrl = ref('http://127.0.0.1:5031')
const weflowChecking = ref(false)
const weflowAvailable = ref(false)
const weflowSessions = ref<any[]>([])
const weflowLoading = ref(false)

async function checkWeFlow() {
  weflowChecking.value = true
  try {
    weflowAvailable.value = await checkWeFlowApi(weflowUrl.value)
    if (weflowAvailable.value) {
      weflowSessions.value = await fetchWeFlowSessions(weflowUrl.value)
      message.success(`已连接 WeFlow，发现 ${weflowSessions.value.length} 个会话`)
    } else {
      message.warning('无法连接 WeFlow API，请确认服务已启动')
    }
  } catch (err: any) {
    weflowAvailable.value = false
    message.error(err.message || '连接 WeFlow 失败')
  } finally {
    weflowChecking.value = false
  }
}

async function importFromWeFlow(sessionId: string) {
  weflowLoading.value = true
  importStore.reset()
  identityStore.reset()
  importStore.setParsing(true)

  try {
    const result = await fetchWeFlowMessages(weflowUrl.value, sessionId)
    importStore.setParseResults([result])

    for (const msg of result.messages) {
      if (msg.type === 'system') {
        const selfIndicators = ['你已添加', '你邀请', '你修改', '你撤回']
        if (selfIndicators.some(ind => msg.content.includes(ind))) {
          identityStore.inferredSelf.push(msg.senderName)
        }
      }
    }

    importStore.setProgress(100)
  } catch (err: any) {
    importStore.setError(err.message || '从 WeFlow 导入失败')
    message.error(err.message || '从 WeFlow 导入失败')
  } finally {
    weflowLoading.value = false
  }
}

async function handleFileChange(fileList: File[]) {
  if (!fileList.length) return

  importStore.reset()
  identityStore.reset()

  const files = Array.from(fileList)
  importStore.setFiles(files)
  importStore.setParsing(true)
  importStore.setProgress(0)

  try {
    const results = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const result = await parseFile(file)
      results.push(result)
      importStore.setProgress(Math.round(((i + 1) / files.length) * 50))
    }
    importStore.setParseResults(results)

    for (const result of results) {
      for (const msg of result.messages) {
        if (msg.type === 'system') {
          const selfIndicators = ['你已添加', '你邀请', '你修改', '你撤回']
          if (selfIndicators.some(ind => msg.content.includes(ind))) {
            identityStore.inferredSelf.push(msg.senderName)
          }
        }
      }
    }

    importStore.setProgress(100)
  } catch (err: any) {
    importStore.setError(err.message || '解析失败')
    message.error(err.message || '解析失败')
  }
}

async function loadDemoData() {
  importStore.reset()
  identityStore.reset()
  importStore.setParsing(true)

  const messages = generateDemoMessages()
  const participants = getDemoParticipants()

  importStore.setParseResults([{
    format: 'demo',
    rawData: messages,
    messages,
    participants,
    metadata: { fileName: '示例聊天记录 (恋爱故事)' },
  }])

  importStore.setProgress(100)
}

async function confirmAndImport(selectedSelf: string, aliases: string[]) {
  importStore.currentStep = 'importing'

  try {
    identityStore.setRole(selectedSelf, 'self')

    for (const p of importStore.allParticipants) {
      if (p.name !== selectedSelf && !identityStore.confirmedMapping.has(p.name)) {
        identityStore.setRole(p.name, 'other')
      }
    }

    for (const alias of aliases) {
      identityStore.addAlias({ name: alias, startTime: 0 })
    }

    for (const result of importStore.parseResults) {
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      const participantMap = new Map<string, string>()
      const participants = result.participants.map((p, idx) => {
        const id = `${sessionId}-p${idx}`
        participantMap.set(p.name, id)
        const role = identityStore.resolveSender({
          timestamp: Date.now(),
          senderName: p.name,
          senderWxid: p.wxid,
          content: '',
          type: 'text',
        })
        return {
          id,
          sessionId,
          wxid: p.wxid,
          names: [p.name],
          role,
          messageCount: 0,
          firstSeen: Infinity,
          lastSeen: 0,
        }
      })

      let minTime = Infinity
      let maxTime = 0
      const messages = result.messages.map((m, idx) => {
        const role = identityStore.resolveSender(m)
        const senderId = participantMap.get(m.senderName) || `${sessionId}-unknown`

        if (m.timestamp < minTime) minTime = m.timestamp
        if (m.timestamp > maxTime) maxTime = m.timestamp

        const msg: any = {
          id: `${sessionId}-m${idx}`,
          sessionId,
          senderId,
          isSelf: role === 'self',
          timestamp: m.timestamp,
          content: m.content,
          type: m.type,
          wordCount: m.content.length,
        }
        return msg
      })

      const emotionResults = analyzeBatchEmotion(messages)
      for (let i = 0; i < messages.length; i++) {
        messages[i].emotion = emotionResults[i].emotion as any
        messages[i].emotionScore = emotionResults[i].score
      }

      for (const p of participants) {
        const pMessages = messages.filter(m => m.senderId === p.id)
        p.messageCount = pMessages.length
        if (pMessages.length > 0) {
          p.firstSeen = Math.min(...pMessages.map(m => m.timestamp))
          p.lastSeen = Math.max(...pMessages.map(m => m.timestamp))
        }
      }

      await sessionStore.createSession({
        id: sessionId,
        name: result.metadata.fileName.replace(/\.\w+$/, ''),
        type: participants.length <= 2 ? 'private' : 'group',
        participantIds: participants.map(p => p.id),
        messageCount: messages.length,
        timeRange: [minTime === Infinity ? Date.now() : minTime, maxTime],
        sourceFormat: result.format,
        sourceFileName: result.metadata.fileName,
      })

      await sessionStore.addParticipants(participants)
      await sessionStore.addMessages(messages)
    }

    await sessionStore.loadSessions()
    importStore.currentStep = 'done'
    message.success('导入成功！')
    await router.push('/dashboard')
  } catch (err: any) {
    importStore.setError(err.message || '导入失败')
    message.error(err.message || '导入失败')
  }
}

defineExpose({ confirmAndImport })
</script>

<template>
  <div class="chat-import">
    <n-upload
      multiple
      :show-file-list="false"
      @change="(options: any) => handleFileChange(options.fileList.map((f: any) => f.file))"
      accept=".json,.csv,.txt,.jsonl"
    >
      <n-upload-dragger
        @dragenter="isDragging = true"
        @dragleave="isDragging = false"
        :class="{ dragging: isDragging }"
      >
        <div style="margin-bottom: 12px">
          <n-icon size="48" :depth="3">
            <archive-icon />
          </n-icon>
        </div>
        <n-text style="font-size: 16px">
          拖拽聊天记录文件到此处，或点击上传
        </n-text>
        <n-p depth="3" style="margin-top: 8px">
          支持: JSON, CSV, TXT, JSONL 格式（推荐 WeFlow / ChatLab 导出）
        </n-p>
      </n-upload-dragger>
    </n-upload>

    <div class="divider">
      <span class="divider-text">或</span>
    </div>

    <n-button
      size="large"
      type="primary"
      ghost
      block
      @click="loadDemoData"
    >
      <template #icon>
        <n-icon><play-outline /></n-icon>
      </template>
      使用示例数据体验（恋爱故事）
    </n-button>

    <div class="divider">
      <span class="divider-text">或</span>
    </div>

    <n-collapse>
      <n-collapse-item title="从 WeFlow API 导入" name="weflow">
        <template #header-extra>
          <n-icon><cloud-download-outline /></n-icon>
        </template>
        <div class="weflow-api-section">
          <n-input
            v-model:value="weflowUrl"
            placeholder="WeFlow API 地址"
            size="small"
            :disabled="weflowChecking"
          />
          <n-button
            size="small"
            type="primary"
            :loading="weflowChecking"
            @click="checkWeFlow"
            style="margin-top: 8px"
          >
            连接
          </n-button>

          <div v-if="weflowAvailable && weflowSessions.length > 0" class="weflow-sessions">
            <n-text depth="3" style="font-size: 13px">选择要导入的会话：</n-text>
            <div
              v-for="session in weflowSessions"
              :key="session.id || session.sessionId"
              class="weflow-session-item"
              @click="importFromWeFlow(session.id || session.sessionId)"
            >
              <span>{{ session.name || session.displayName || session.id }}</span>
              <n-text depth="3" style="font-size: 12px">
                {{ session.messageCount || session.message_count || 0 }} 条消息
              </n-text>
            </div>
          </div>

          <div v-if="weflowAvailable && weflowSessions.length === 0" style="margin-top: 8px">
            <n-text depth="3" style="font-size: 13px">未发现会话数据</n-text>
          </div>
        </div>
      </n-collapse-item>
    </n-collapse>

    <div v-if="importStore.isParsing" class="progress-area">
      <n-text>解析中... {{ importStore.parseProgress }}%</n-text>
    </div>

    <div v-if="importStore.error" class="error-area">
      <n-text type="error">{{ importStore.error }}</n-text>
    </div>
  </div>
</template>

<style scoped>
.chat-import {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
}

.dragging {
  border-color: #18a058;
  background: #f0f9f4;
}

.divider {
  display: flex;
  align-items: center;
  margin: 24px 0;
  color: #999;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e0e0e0;
}

.divider-text {
  padding: 0 16px;
  font-size: 14px;
}

.progress-area {
  margin-top: 20px;
  text-align: center;
}

.error-area {
  margin-top: 20px;
  text-align: center;
  padding: 12px;
  background: #fff2f0;
  border-radius: 8px;
}

.weflow-api-section {
  padding: 8px 0;
}

.weflow-sessions {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.weflow-session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  background: var(--hover-bg);
}

.weflow-session-item:hover {
  background: var(--border-color);
}
</style>
