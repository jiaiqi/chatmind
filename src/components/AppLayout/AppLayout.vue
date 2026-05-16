<script setup lang="ts">
import { computed, h } from 'vue'
import {
  NLayout, NLayoutSider, NLayoutContent,
  NMenu, NButton, NAvatar, NDivider,
  NIcon, NTooltip,
} from 'naive-ui'
import {
  ChatbubblesOutline, StatsChartOutline,
  TrendingUpOutline, SparklesOutline, TrashOutline,
} from '@vicons/ionicons5'
import { useSessionStore } from '../../stores/session'
import type { MenuOption } from 'naive-ui'

const sessionStore = useSessionStore()

const props = defineProps<{
  activeView: string
}>()

const emit = defineEmits<{
  'update:activeView': [view: string]
  'deleteSession': [sessionId: string]
}>()

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
      key: 'ai',
      label: 'AI 分析师',
      icon: () => h(NIcon, null, { default: () => h(SparklesOutline) }),
    },
  ]
  return options
})

function handleMenuUpdate(key: string) {
  emit('update:activeView', key)
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

      <div class="session-info" v-if="sessionStore.currentSession">
        <div class="session-name">{{ currentSessionName }}</div>
        <div class="session-meta">{{ currentSessionTime }}</div>
      </div>

      <n-menu
        :value="activeView"
        :collapsed-width="64"
        :collapsed-icon-size="22"
        :options="menuOptions"
        @update:value="handleMenuUpdate"
      />

      <div class="sider-footer">
        <n-tooltip placement="right">
          <template #trigger>
            <n-button
              text
              circle
              size="small"
              @click="emit('deleteSession', sessionStore.currentSessionId!)"
            >
              <n-icon><trash-outline /></n-icon>
            </n-button>
          </template>
          删除当前会话
        </n-tooltip>
        <n-button
          text
          size="small"
          @click="emit('update:activeView', 'import')"
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
  color: #333;
}

.session-info {
  padding: 8px 16px;
}

.session-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-meta {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.sider-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.main-content {
  background: #f5f7fa;
  overflow-y: auto;
}
</style>
