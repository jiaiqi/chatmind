<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import ChatImport from '../components/ChatImport/ChatImport.vue'
import IdentitySelector from '../components/IdentitySelector/IdentitySelector.vue'
import { useImportStore } from '../stores/import'

const importStore = useImportStore()
const message = useMessage()

const showIdentitySelector = ref(false)
const chatImportRef = ref<InstanceType<typeof ChatImport> | null>(null)

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
</script>

<template>
  <div class="import-view">
    <div class="header">
      <h1>ChatMind</h1>
      <p class="subtitle">用 AI 读懂你们的关系</p>
    </div>

    <ChatImport ref="chatImportRef" />

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
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
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
  color: #333;
  margin: 0;
  letter-spacing: -1px;
}

.subtitle {
  font-size: 18px;
  color: #666;
  margin-top: 8px;
}
</style>
