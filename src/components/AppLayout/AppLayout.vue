<script setup lang="ts">
import { computed, h, ref } from 'vue'
import {
  NLayout, NLayoutSider, NLayoutContent,
  NMenu, NButton, NAvatar, NDivider,
  NIcon, NTooltip, NSelect, NPopconfirm, NInput,
} from 'naive-ui'
import {
  ChatbubblesOutline, StatsChartOutline,
  TrendingUpOutline, SparklesOutline, TrashOutline,
  AnalyticsOutline, MoonOutline, SunnyOutline,
  DownloadOutline, CreateOutline,
} from '@vicons/ionicons5'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '../../stores/session'
import { useThemeStore } from '../../stores/theme'
import { useAnalysisStore } from '../../stores/analysis'
import type { MenuOption } from 'naive-ui'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()
const themeStore = useThemeStore()
const analysisStore = useAnalysisStore()

const emit = defineEmits<{
  'deleteSession': [sessionId: string]
}>()

const isRenaming = ref(false)
const renameValue = ref('')

const sessionOptions = computed(() =>
  sessionStore.sessions.map(s => ({
    label: s.name,
    value: s.id,
  }))
)

function handleSessionChange(id: string) {
  sessionStore.setCurrentSession(id)
  analysisStore.invalidate()
}

function startRename() {
  const session = sessionStore.currentSession
  if (!session) return
  renameValue.value = session.name
  isRenaming.value = true
}

async function confirmRename() {
  if (!renameValue.value.trim() || !sessionStore.currentSessionId) return
  await sessionStore.renameSession(sessionStore.currentSessionId, renameValue.value.trim())
  isRenaming.value = false
}

function cancelRename() {
  isRenaming.value = false
}

const menuOptions = computed<MenuOption[]>(() => {
  const options: MenuOption[] = [
    {
      key: 'dashboard',
      label: '分析仪表盘',
      icon: () => h(NIcon, null, { default: () => h(StatsChartOutline) }),
    },
    {
      key: 'timeline',
      label: '情绪时间轴',
      icon: () => h(NIcon, null, { default: () => h(TrendingUpOutline) }),
    },
    {
      key: 'messages',
      label: '聊天记录',
      icon: () => h(NIcon, null, { default: () => h(ChatbubblesOutline) }),
    },
    {
      key: 'analysis',
      label: '深度分析',
      icon: () => h(NIcon, null, { default: () => h(AnalyticsOutline) }),
    },
    {
      key: 'ai',
      label: 'AI 分析师',
      icon: () => h(NIcon, null, { default: () => h(SparklesOutline) }),
    },
    {
      key: 'report',
      label: '报告导出',
      icon: () => h(NIcon, null, { default: () => h(DownloadOutline) }),
    },
  ]
  return options
})

const activeMenuKey = computed(() => route.path.replace('/', '') || 'dashboard')

function handleMenuUpdate(key: string) {
  router.push(`/${key}`)
}

const currentSessionName = computed(() => {
  return sessionStore.currentSession?.name || '未命名会话'
})

const currentSessionTime = computed(() => {
  const session = sessionStore.currentSession
  if (!session) return ''
  const [start] = session.timeRange
  return new Date(start).toLocaleDateString('zh-CN')
})
</script>

<template>
  <n-layout has-sider style="height: 100vh">
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      show-trigger
    >
      <div class="sider-header">
        <div class="logo">
          <n-avatar round size="small" style="background: #18a058">CM</n-avatar>
          <span class="logo-text">ChatMind</span>
        </div>
      </div>

      <n-divider style="margin: 8px 0" />

      <div class="session-info" v-if="sessionStore.sessions.length > 0">
        <n-select
          :value="sessionStore.currentSessionId"
          :options="sessionOptions"
          size="small"
          @update:value="handleSessionChange"
        />
        <div v-if="isRenaming" class="rename-row">
          <n-input
            v-model:value="renameValue"
            size="tiny"
            placeholder="新名称"
            @keyup.enter="confirmRename"
            @keyup.escape="cancelRename"
          />
          <n-button size="tiny" type="primary" @click="confirmRename">确定</n-button>
          <n-button size="tiny" @click="cancelRename">取消</n-button>
        </div>
        <div v-else class="session-actions">
          <n-button text size="tiny" @click="startRename">
            <n-icon size="14"><create-outline /></n-icon>
            重命名
          </n-button>
          <n-popconfirm @positive-click="emit('deleteSession', sessionStore.currentSessionId!)">
            <template #trigger>
              <n-button text size="tiny" type="error">
                <n-icon size="14"><trash-outline /></n-icon>
                删除
              </n-button>
            </template>
            确定删除此会话？所有消息将被清除。
          </n-popconfirm>
        </div>
      </div>

      <n-menu
        :value="activeMenuKey"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        @update:value="handleMenuUpdate"
      />

      <div class="sider-footer">
        <n-space align="center">
          <n-tooltip placement="right">
            <template #trigger>
              <n-button
                text
                circle
                size="small"
                @click="themeStore.toggle()"
              >
                <n-icon>
                  <moon-outline v-if="!themeStore.isDark" />
                  <sunny-outline v-else />
                </n-icon>
              </n-button>
            </template>
            {{ themeStore.isDark ? '切换亮色' : '切换暗色' }}
          </n-tooltip>
        </n-space>

        <n-button
          text
          size="small"
          @click="router.push('/import')"
        >
          + 导入新数据
        </n-button>
      </div>
    </n-layout-sider>

    <n-layout-content class="main-content">
      <slot />
    </n-layout-content>
  </n-layout>
</template>

<style scoped>
.sider-header {
  padding: 16px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.session-info {
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.session-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.rename-row {
  display: flex;
  gap: 4px;
  align-items: center;
}

.sider-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.main-content {
  background: var(--app-bg);
  overflow-y: auto;
}
</style>
