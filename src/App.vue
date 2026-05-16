<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { NMessageProvider, NConfigProvider, zhCN, dateZhCN } from 'naive-ui'
import { useSessionStore } from './stores/session'
import ImportView from './views/ImportView.vue'
import DashboardView from './views/DashboardView.vue'

const sessionStore = useSessionStore()

const showDashboard = computed(() => {
  return sessionStore.sessions.length > 0 && sessionStore.currentSessionId
})

onMounted(() => {
  sessionStore.loadSessions()
})
</script>

<template>
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider>
      <div class="app">
        <DashboardView v-if="showDashboard" />
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
