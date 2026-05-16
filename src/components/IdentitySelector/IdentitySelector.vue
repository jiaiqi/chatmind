<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { NModal, NRadio, NRadioGroup, NButton, NSpace, NInput, NTag, NText, useMessage } from 'naive-ui'
import { useImportStore } from '../../stores/import'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  confirm: [selectedSelf: string, aliases: string[]]
  cancel: []
}>()

const importStore = useImportStore()
const message = useMessage()

const selectedSelf = ref<string | null>(null)
const aliasInput = ref('')
const aliases = ref<string[]>([])

const participants = computed(() => {
  const list = importStore.allParticipants
  const msgCounts = new Map<string, number>()
  for (const m of importStore.allMessages) {
    msgCounts.set(m.senderName, (msgCounts.get(m.senderName) || 0) + 1)
  }
  return list.map(p => ({
    ...p,
    messageCount: msgCounts.get(p.name) || 0,
  })).sort((a, b) => b.messageCount - a.messageCount)
})

watch(() => props.show, (show) => {
  if (show) {
    selectedSelf.value = null
    aliases.value = []
    aliasInput.value = ''
  }
})

function addAlias() {
  const name = aliasInput.value.trim()
  if (name && !aliases.value.includes(name)) {
    aliases.value.push(name)
    aliasInput.value = ''
  }
}

function removeAlias(name: string) {
  aliases.value = aliases.value.filter(a => a !== name)
}

function handleConfirm() {
  if (!selectedSelf.value) {
    message.warning('请选择你的身份')
    return
  }
  emit('confirm', selectedSelf.value, aliases.value)
}
</script>

<template>
  <n-modal
    :show="show"
    title="确认身份"
    preset="card"
    style="width: 500px; max-width: 90vw"
    :mask-closable="false"
    :closable="false"
  >
    <div class="identity-selector">
      <n-text depth="2">
        我们检测到以下参与者，请告诉"我"是谁：
      </n-text>

      <div class="participant-list">
        <n-radio-group v-model:value="selectedSelf" vertical>
          <n-space vertical size="large">
            <div
              v-for="p in participants"
              :key="p.name"
              class="participant-item"
              :class="{ selected: selectedSelf === p.name }"
            >
              <n-radio :value="p.name">
                <span class="participant-name">{{ p.name }}</span>
                <n-text depth="3" class="participant-count">
                  出现 {{ p.messageCount }} 次
                </n-text>
                <n-tag v-if="p.wxid" size="small" type="info" class="wxid-tag">
                  {{ p.wxid }}
                </n-tag>
              </n-radio>
            </div>
          </n-space>
        </n-radio-group>
      </div>

      <div class="alias-section">
        <n-text depth="2">我曾用过的名字（帮助识别改名历史）：</n-text>
        <div class="alias-input-row">
          <n-input
            v-model:value="aliasInput"
            placeholder="输入曾用名，按回车添加"
            @keyup.enter="addAlias"
            style="flex: 1"
          />
          <n-button @click="addAlias">添加</n-button>
        </div>
        <div class="alias-tags">
          <n-tag
            v-for="alias in aliases"
            :key="alias"
            closable
            @close="removeAlias(alias)"
          >
            {{ alias }}
          </n-tag>
        </div>
      </div>

      <div class="actions">
        <n-button @click="emit('cancel')">取消</n-button>
        <n-button type="primary" @click="handleConfirm">
          确认并开始分析
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.identity-selector {
  padding: 8px 0;
}

.participant-list {
  margin: 16px 0;
  max-height: 300px;
  overflow-y: auto;
}

.participant-item {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.participant-item:hover {
  background: #f5f5f5;
}

.participant-item.selected {
  border-color: #18a058;
  background: #f0f9f4;
}

.participant-name {
  font-weight: 500;
  margin-right: 8px;
}

.participant-count {
  font-size: 12px;
  margin-right: 8px;
}

.wxid-tag {
  font-size: 10px;
}

.alias-section {
  margin: 16px 0;
}

.alias-input-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.alias-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
