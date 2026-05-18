import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DEFAULT_PROVIDERS, getProviderById, type ModelInfo } from '../ai/providers'

export interface ModelSetting {
  providerId: string
  modelId: string
  apiKey: string
  customBaseUrl?: string
  customModelId?: string
  isActive: boolean
}

const STORAGE_KEY = 'chatmind_model_settings'
const ACTIVE_KEY = 'chatmind_active_model'

export const useModelConfigStore = defineStore('model-config', () => {
  // 加载保存的配置
  const loadSettings = (): ModelSetting[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch { /* ignore */ }
    return []
  }

  const loadActive = (): string | null => {
    return localStorage.getItem(ACTIVE_KEY)
  }

  const settings = ref<ModelSetting[]>(loadSettings())
  const activeSettingId = ref<string | null>(loadActive())

  const providers = computed(() => DEFAULT_PROVIDERS)

  const activeSetting = computed(() => {
    if (!activeSettingId.value) return null
    return settings.value.find(s => getSettingId(s) === activeSettingId.value) || null
  })

  const activeProvider = computed(() => {
    if (!activeSetting.value) return null
    return getProviderById(activeSetting.value.providerId)
  })

  const activeModel = computed(() => {
    const provider = activeProvider.value
    const setting = activeSetting.value
    if (!provider || !setting) return null

    // 自定义模型
    if (setting.providerId === 'custom' && setting.customModelId) {
      return {
        id: setting.customModelId,
        name: setting.customModelId,
        description: '自定义模型',
      } as ModelInfo
    }

    return provider.models.find(m => m.id === setting.modelId) || null
  })

  const hasAnyConfig = computed(() => settings.value.length > 0)

  const configuredModels = computed(() => {
    return settings.value.map(s => {
      const provider = getProviderById(s.providerId)
      const model = provider?.models.find(m => m.id === s.modelId)
      const isOllama = s.providerId === 'ollama'
      return {
        id: getSettingId(s),
        providerName: provider?.name || s.providerId,
        modelName: s.providerId === 'custom'
          ? (s.customModelId || '自定义模型')
          : (model?.name || s.modelId),
        isActive: getSettingId(s) === activeSettingId.value,
        hasKey: isOllama ? true : !!s.apiKey,
      }
    })
  })

  function getSettingId(setting: ModelSetting): string {
    if (setting.providerId === 'custom') {
      return `custom-${setting.customModelId || 'default'}`
    }
    return `${setting.providerId}-${setting.modelId}`
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
  }

  function addSetting(setting: ModelSetting) {
    const id = getSettingId(setting)
    // 如果已存在，更新它
    const existingIndex = settings.value.findIndex(s => getSettingId(s) === id)
    if (existingIndex >= 0) {
      settings.value[existingIndex] = setting
    } else {
      settings.value.push(setting)
    }
    saveSettings()
    // 自动激活新添加的
    activeSettingId.value = id
    localStorage.setItem(ACTIVE_KEY, id)
  }

  function removeSetting(id: string) {
    settings.value = settings.value.filter(s => getSettingId(s) !== id)
    saveSettings()
    if (activeSettingId.value === id) {
      activeSettingId.value = settings.value[0] ? getSettingId(settings.value[0]) : null
      if (activeSettingId.value) {
        localStorage.setItem(ACTIVE_KEY, activeSettingId.value)
      } else {
        localStorage.removeItem(ACTIVE_KEY)
      }
    }
  }

  function setActive(id: string) {
    activeSettingId.value = id
    localStorage.setItem(ACTIVE_KEY, id)
  }

  function updateApiKey(id: string, apiKey: string) {
    const setting = settings.value.find(s => getSettingId(s) === id)
    if (setting) {
      setting.apiKey = apiKey
      saveSettings()
    }
  }

  function getAiConfig() {
    const setting = activeSetting.value
    const provider = activeProvider.value
    if (!setting || !provider) return null

    return {
      provider: provider.id,
      baseUrl: setting.customBaseUrl || provider.baseUrl,
      apiKey: setting.providerId === 'ollama' ? '' : setting.apiKey,
      model: setting.providerId === 'custom'
        ? (setting.customModelId || 'custom-model')
        : setting.modelId,
      extraHeaders: provider.extraHeaders,
      supportsFunctionCalling: provider.supportsFunctionCalling ?? false,
    }
  }

  return {
    settings,
    activeSettingId,
    providers,
    activeSetting,
    activeProvider,
    activeModel,
    hasAnyConfig,
    configuredModels,
    getSettingId,
    addSetting,
    removeSetting,
    setActive,
    updateApiKey,
    getAiConfig,
  }
})
