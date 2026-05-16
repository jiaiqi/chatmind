<script setup lang="ts">
import { onMounted } from 'vue'
import { NConfigProvider, NMessageProvider, zhCN, dateZhCN, darkTheme } from 'naive-ui'
import { useThemeStore } from './stores/theme'
import { useSessionStore } from './stores/session'
import AppLayout from './components/AppLayout/AppLayout.vue'

const themeStore = useThemeStore()
const sessionStore = useSessionStore()

onMounted(() => {
  themeStore.applyTheme()
})

function handleDeleteSession(sessionId: string) {
  sessionStore.deleteSession(sessionId)
}
</script>

<template>
  <n-config-provider
    :locale="zhCN"
    :date-locale="dateZhCN"
    :theme="themeStore.isDark ? darkTheme : undefined"
  >
    <n-message-provider>
      <div class="app" :class="{ dark: themeStore.isDark }">
        <AppLayout @delete-session="handleDeleteSession">
          <router-view />
        </AppLayout>
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
  background: var(--app-bg);
  color: var(--text-color);
}

/* Light theme (default) */
:root {
  --app-bg: #f5f7fa;
  --card-bg: #ffffff;
  --text-color: #333333;
  --text-secondary: #666666;
  --text-muted: #999999;
  --border-color: #e0e0e0;
  --hover-bg: #f5f5f5;
  --message-self-bg: #e6f7ff;
  --message-assistant-bg: #f6ffed;
}

/* Dark theme */
[data-theme="dark"] {
  --app-bg: #0d1117;
  --card-bg: #161b22;
  --text-color: #c9d1d9;
  --text-secondary: #8b949e;
  --text-muted: #6e7681;
  --border-color: #30363d;
  --hover-bg: #21262d;
  --message-self-bg: #1c2b3a;
  --message-assistant-bg: #1c2b1c;
}
</style>
