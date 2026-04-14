<template>
  <div class="admin-layout">
    <aside class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <span class="logo-icon">🧳</span>
        <span v-if="!isCollapsed" class="logo-text">管理后台</span>
      </div>
      <el-menu
        :default-active="currentRoute"
        :collapse="isCollapsed"
        background-color="#3D3028"
        text-color="#D4C4B0"
        active-text-color="#E8A87C"
        router
      >
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </aside>

    <div class="main-area">
      <header class="topbar">
        <div class="topbar-left">
          <el-icon class="collapse-btn" @click="isCollapsed = !isCollapsed">
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
          <span class="page-title">{{ currentTitle }}</span>
        </div>
        <div class="topbar-right">
          <el-dropdown @command="handleCommand">
            <span class="admin-info">
              <el-avatar :size="32" style="background:#E8A87C;">A</el-avatar>
              <span class="admin-name">{{ authStore.user?.username || 'Admin' }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Fold, Expand } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const isCollapsed = ref(false)

const menuItems = [
  { path: '/dashboard', title: '仪表盘', icon: 'DataAnalysis' },
  { path: '/users', title: '用户管理', icon: 'User' },
  { path: '/posts', title: '帖子管理', icon: 'Document' },
  { path: '/comments', title: '评论管理', icon: 'ChatDotRound' },
  { path: '/reports', title: '举报管理', icon: 'Warning' },
]

const currentRoute = computed(() => '/' + (route.path.split('/')[1] || 'dashboard'))
const currentTitle = computed(() => {
  const item = menuItems.find(m => m.path === currentRoute.value)
  return item?.title || '管理后台'
})

const handleCommand = (cmd: string) => {
  if (cmd === 'logout') {
    authStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}
.sidebar {
  width: 220px;
  background: #3D3028;
  transition: width 0.3s;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.sidebar.collapsed { width: 64px; }
.sidebar-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.logo-icon { font-size: 28px; }
.logo-text { color: #FFF8F0; font-size: 16px; font-weight: 700; }
.main-area { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.topbar {
  height: 64px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  flex-shrink: 0;
}
.topbar-left { display: flex; align-items: center; gap: 16px; }
.collapse-btn { font-size: 20px; cursor: pointer; color: #8C8C8C; }
.page-title { font-size: 18px; font-weight: 600; color: #3D3028; }
.topbar-right { display: flex; align-items: center; }
.admin-info { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.admin-name { font-size: 14px; color: #5B4636; }
.content {
  flex: 1;
  padding: 24px;
  background: #FFF8F0;
  overflow-y: auto;
}
:deep(.el-menu) { border-right: none; }
:deep(.el-menu-item) { height: 50px; line-height: 50px; }
:deep(.el-menu-item.is-active) { background: rgba(232,168,124,0.12) !important; }
</style>
