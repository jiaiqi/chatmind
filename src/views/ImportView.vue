<script setup lang="ts">
import { ref, watch } from 'vue'
import { NButton, NSpace, NDivider, useMessage } from 'naive-ui'
import ChatImport from '../components/ChatImport/ChatImport.vue'
import IdentitySelector from '../components/IdentitySelector/IdentitySelector.vue'
import { useImportStore } from '../stores/import'
import { useSessionStore } from '../stores/session'
import { useAnalysisStore } from '../stores/analysis'
import { exportBackup, importBackup, downloadBackupFile, readBackupFile } from '../utils/backup'

const importStore = useImportStore()
const sessionStore = useSessionStore()
const analysisStore = useAnalysisStore()
const message = useMessage()

const showIdentitySelector = ref(false)
const chatImportRef = ref<InstanceType<typeof ChatImport> | null>(null)
const isExporting = ref(false)
const isImporting = ref(false)

watch(() => importStore.currentStep, (step) => {
  if (step === 'confirming_identity') {
    showIdentitySelector.value = true
  }
})

function handleIdentityConfirm(selectedSelf: string, aliases: string[]) {
  showIdentitySelector.value = false
  chatImportRef.value?.confirmAndImport(selectedSelf, aliases)
}

function handleIdentityCancel() {
  showIdentitySelector.value = false
  importStore.reset()
}

async function handleExport() {
  isExporting.value = true
  try {
    const content = await exportBackup()
    downloadBackupFile(content)
    message.success('备份导出成功')
  } catch (err: any) {
    message.error(`导出失败: ${err.message}`)
  } finally {
    isExporting.value = false
  }
}

async function handleImportBackup(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  isImporting.value = true
  try {
    const content = await readBackupFile(file)
    const result = await importBackup(content)
    await sessionStore.loadSessions()
    analysisStore.invalidate()
    message.success(`恢复成功：${result.sessions} 个会话，${result.messages} 条消息`)
  } catch (err: any) {
    message.error(`恢复失败: ${err.message}`)
  } finally {
    isImporting.value = false
    input.value = ''
  }
}
</script>

<template>
  <div class="import-view">
    <div class="header">
      <h1>ChatMind</h1>
      <p class="subtitle">用 AI 读懂你们的关系</p>
    </div>

    <ChatImport ref="chatImportRef" />

    <n-divider style="margin: 24px 0">数据管理</n-divider>

    <n-space justify="center">
      <n-button :loading="isExporting" @click="handleExport">
        导出备份
      </n-button>
      <n-button :loading="isImporting" @click="($refs.backupInput as HTMLInputElement)?.click()">
        恢复备份
      </n-button>
      <input
        ref="backupInput"
        type="file"
        accept=".json"
        style="display: none"
        @change="handleImportBackup"
      />
    </n-space>

    <IdentitySelector
      :show="showIdentitySelector"
      @confirm="handleIdentityConfirm"
      @cancel="handleIdentityCancel"
    />
  </div>
</template>

<style scoped>
.import-view {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--app-bg) 0%, var(--hover-bg) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.header h1 {
  font-size: 42px;
  font-weight: 700;
  color: var(--text-color);
  margin: 0;
  letter-spacing: -1px;
}

.subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  margin-top: 8px;
}
</style>
