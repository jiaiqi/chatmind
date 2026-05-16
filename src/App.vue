<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { NConfigProvider, NMessageProvider, zhCN, dateZhCN } from 'naive-ui'
import { useSessionStore } from './stores/session'
import AppLayout from './components/AppLayout/AppLayout.vue'
import ImportView from './views/ImportView.vue'
import DashboardView from './views/DashboardView.vue'
import TimelineView from './views/TimelineView.vue'
import MessageListView from './views/MessageListView.vue'

const sessionStore = useSessionStore()
const activeView = ref('dashboard')

const showLayout = computed(() => {
  return sessionStore.sessions.length > 0 && sessionStore.currentSessionId && activeView.value !== 'import'
})

watch(() => sessionStore.sessions.length, (len) => {
  if (len === 0) {
    activeView.value = 'import'
  } else if (activeView.value === 'import') {
    activeView.value = 'dashboard'
  }
})

onMounted(() => {
  sessionStore.loadSessions()
})

function handleDeleteSession(sessionId: string) {
  sessionStore.deleteSession(sessionId)
}
</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider>
      <div class="app">
        <AppLayout
          v-if="showLayout"
          v-model:active-view="activeView"
          @delete-session="handleDeleteSession"
        >
          <DashboardView v-if="activeView === 'dashboard'" />
          <TimelineView v-else-if="activeView === 'timeline'" />
          <MessageListView v-else-if="activeView === 'messages'" />
          <div v-else-if="activeView === 'ai'" style="padding: 40px; text-align: center">
            <n-empty description="AI 分析师功能开发中..." />
          </div>
          <ImportView v-else-if="activeView === 'import'" />
        </AppLayout>

        <ImportView v-else />
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.app {
  min-height: 100vh;
}
</style>
