import { createRouter, createWebHashHistory } from 'vue-router'
import { useSessionStore } from '../stores/session'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/import', component: () => import('../views/ImportView.vue') },
  { path: '/dashboard', component: () => import('../views/DashboardView.vue') },
  { path: '/timeline', component: () => import('../views/TimelineView.vue') },
  { path: '/messages', component: () => import('../views/MessageListView.vue') },
  { path: '/analysis', component: () => import('../views/AnalysisView.vue') },
  { path: '/ai', component: () => import('../views/AiChatView.vue') },
  { path: '/report', component: () => import('../views/ReportExportView.vue') },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

let sessionsLoaded = false

router.beforeEach(async (to) => {
  const sessionStore = useSessionStore()
  if (!sessionsLoaded) {
    await sessionStore.loadSessions()
    sessionsLoaded = true
  }
  if (to.path === '/import') return true
  if (sessionStore.sessions.length === 0) {
    return '/import'
  }
  return true
})

export default router
