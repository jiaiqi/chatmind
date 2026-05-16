import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

type ThemeMode = 'light' | 'dark' | 'auto'

const STORAGE_KEY = 'chatmind_theme_mode'

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>((localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'auto')

  const isDark = computed(() => {
    if (mode.value === 'auto') return getSystemTheme() === 'dark'
    return mode.value === 'dark'
  })

  function setMode(newMode: ThemeMode) {
    mode.value = newMode
    localStorage.setItem(STORAGE_KEY, newMode)
    applyTheme()
  }

  function toggle() {
    setMode(isDark.value ? 'light' : 'dark')
  }

  function applyTheme() {
    const dark = isDark.value
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  }

  // 监听系统主题变化
  watch(mode, applyTheme, { immediate: true })

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (mode.value === 'auto') applyTheme()
  })

  return {
    mode,
    isDark,
    setMode,
    toggle,
    applyTheme,
  }
})
