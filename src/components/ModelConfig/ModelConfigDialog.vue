<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  NModal, NForm, NFormItem, NSelect, NInput,
  NButton, NSpace, NCard, NTag, NText, NDivider,
  useMessage,
} from 'naive-ui'
import { useModelConfigStore, type ModelSetting } from '../../stores/model-config'
import { getProviderById } from '../../ai/providers'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const modelConfig = useModelConfigStore()
const message = useMessage()

const showAddPanel = ref(false)
const selectedProvider = ref<string>('')
const selectedModel = ref<string>('')
const apiKeyInput = ref('')
const customBaseUrl = ref('')
const customModelId = ref('')

const providerOptions = computed(() =>
  modelConfig.providers.map(p => ({
    label: p.name,
    value: p.id,
  }))
)

const modelOptions = computed(() => {
  const provider = getProviderById(selectedProvider.value)
  if (!provider) return []
  return provider.models.map(m => ({
    label: `${m.name}${m.description ? ` - ${m.description}` : ''}`,
    value: m.id,
  }))
})

const isCustomProvider = computed(() => selectedProvider.value === 'custom')

watch(() => props.show, (show) => {
  if (show) {
    showAddPanel.value = false
    resetForm()
  }
})

watch(selectedProvider, () => {
  selectedModel.value = ''
})

function resetForm() {
  selectedProvider.value = ''
  selectedModel.value = ''
  apiKeyInput.value = ''
  customBaseUrl.value = ''
  customModelId.value = ''
}

function handleAdd() {
  if (!selectedProvider.value) {
    message.warning('请选择模型提供商')
    return
  }
  if (!isCustomProvider.value && !selectedModel.value) {
    message.warning('请选择模型')
    return
  }
  if (!apiKeyInput.value.trim()) {
    message.warning('请输入 API Key')
    return
  }

  const provider = getProviderById(selectedProvider.value)
  if (!provider) return

  const setting: ModelSetting = {
    providerId: selectedProvider.value,
    modelId: isCustomProvider.value ? 'custom-model' : selectedModel.value,
    apiKey: apiKeyInput.value.trim(),
    customBaseUrl: isCustomProvider.value ? customBaseUrl.value.trim() : undefined,
    customModelId: isCustomProvider.value ? customModelId.value.trim() : undefined,
    isActive: true,
  }

  modelConfig.addSetting(setting)
  message.success('添加成功')
  showAddPanel.value = false
  resetForm()
}

function handleDelete(id: string) {
  modelConfig.removeSetting(id)
  message.success('已删除')
}

function handleActivate(id: string) {
  modelConfig.setActive(id)
  message.success('已切换')
}

</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    title="模型配置"
    style="width: 600px; max-width: 90vw; max-height: 80vh"
    @update:show="emit('update:show', $event)"
  >
    <div class="model-config-dialog">
      <!-- 已配置的模型列表 -->
      <div class="configured-models">
        <n-text depth="2">已配置的模型：</n-text>
        <n-space vertical style="margin-top: 12px">
          <n-card
            v-for="m in modelConfig.configuredModels"
            :key="m.id"
            size="small"
            :class="{ active: m.isActive }"
          >
            <div class="model-item">
              <div class="model-info">
                <n-tag v-if="m.isActive" type="success" size="small">当前使用</n-tag>
                <n-tag v-else type="default" size="small">备用</n-tag>
                <span class="model-name">{{ m.providerName }} / {{ m.modelName }}</span>
                <n-tag :type="m.hasKey ? 'success' : 'error'" size="small">
                  {{ m.hasKey ? '已配置Key' : '未配置Key' }}
                </n-tag>
              </div>
              <n-space>
                <n-button
                  v-if="!m.isActive"
                  size="small"
                  @click="handleActivate(m.id)"
                >
                  切换
                </n-button>
                <n-button
                  size="small"
                  type="error"
                  ghost
                  @click="handleDelete(m.id)"
                >
                  删除
                </n-button>
              </n-space>
            </div>
          </n-card>
        </n-space>
      </div>

      <n-divider />

      <!-- 添加新模型 -->
      <div class="add-section">
        <n-button
          v-if="!showAddPanel"
          block
          dashed
          @click="showAddPanel = true"
        >
          + 添加模型
        </n-button>

        <div v-else class="add-form">
          <n-form label-placement="left" label-width="100">
            <n-form-item label="提供商" required>
              <n-select
                v-model:value="selectedProvider"
                :options="providerOptions"
                placeholder="选择模型提供商"
              />
            </n-form-item>

            <n-form-item
              v-if="!isCustomProvider"
              label="模型"
              required
            >
              <n-select
                v-model:value="selectedModel"
                :options="modelOptions"
                placeholder="选择模型"
              />
            </n-form-item>

            <template v-if="isCustomProvider">
              <n-form-item label="Base URL" required>
                <n-input
                  v-model:value="customBaseUrl"
                  placeholder="https://api.example.com/v1"
                />
              </n-form-item>
              <n-form-item label="模型ID" required>
                <n-input
                  v-model:value="customModelId"
                  placeholder="model-name"
                />
              </n-form-item>
            </template>

            <n-form-item label="API Key" required>
              <n-input
                v-model:value="apiKeyInput"
                type="password"
                placeholder="输入 API Key"
                show-password-on="mousedown"
              />
              <template #feedback v-if="selectedProvider">
                <n-text depth="3" style="font-size: 12px">
                  获取 Key:
                  <a
                    :href="getProviderById(selectedProvider)?.apiKeyUrl"
                    target="_blank"
                    rel="noopener"
                  >
                    {{ getProviderById(selectedProvider)?.name }} 控制台
                  </a>
                </n-text>
              </template>
            </n-form-item>
          </n-form>

          <n-space justify="end">
            <n-button @click="showAddPanel = false">取消</n-button>
            <n-button type="primary" @click="handleAdd">添加</n-button>
          </n-space>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.model-config-dialog {
  max-height: 60vh;
  overflow-y: auto;
}

.configured-models {
  margin-bottom: 16px;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.model-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-name {
  font-weight: 500;
}

.n-card.active {
  border-color: #18a058;
  background: #f0f9f4;
}

.add-form {
  padding: 8px 0;
}
</style>
