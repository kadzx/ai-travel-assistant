import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layout/AdminLayout.vue'),
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue'), meta: { title: '仪表盘', icon: 'DataAnalysis' } },
        { path: 'users', name: 'Users', component: () => import('@/views/Users.vue'), meta: { title: '用户管理', icon: 'User' } },
        { path: 'posts', name: 'Posts', component: () => import('@/views/Posts.vue'), meta: { title: '帖子管理', icon: 'Document' } },
        { path: 'comments', name: 'Comments', component: () => import('@/views/Comments.vue'), meta: { title: '评论管理', icon: 'ChatDotRound' } },
        { path: 'reports', name: 'Reports', component: () => import('@/views/Reports.vue'), meta: { title: '举报管理', icon: 'Warning' } },
      ],
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  const token = localStorage.getItem('admin_token')
  if (!token) return '/login'
  return true
})

export default router
