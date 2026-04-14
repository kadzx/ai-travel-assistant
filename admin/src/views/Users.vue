<template>
  <div class="page-container">
    <div class="filter-bar">
      <el-input v-model="keyword" placeholder="搜索用户名/邮箱/昵称" prefix-icon="Search" clearable style="width:280px;" @clear="fetchData" @keyup.enter="fetchData" />
      <el-select v-model="roleFilter" placeholder="角色" clearable style="width:120px;" @change="fetchData">
        <el-option label="用户" value="user" />
        <el-option label="管理员" value="admin" />
      </el-select>
      <el-button type="primary" @click="fetchData">搜索</el-button>
    </div>

    <el-table :data="list" v-loading="loading" stripe class="cream-table">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="头像" width="70">
        <template #default="{ row }">
          <el-avatar :size="36" :src="row.avatar || undefined">{{ (row.nickname || row.username || '?')[0] }}</el-avatar>
        </template>
      </el-table-column>
      <el-table-column prop="username" label="用户名" width="130" />
      <el-table-column prop="nickname" label="昵称" width="130" />
      <el-table-column prop="email" label="邮箱" min-width="180" />
      <el-table-column label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'warning' : 'info'" size="small">{{ row.role === 'admin' ? '管理员' : '用户' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'banned' ? 'danger' : 'success'" size="small">{{ row.status === 'banned' ? '封禁' : '正常' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="注册时间" width="170">
        <template #default="{ row }">{{ row.created_at?.slice(0, 16).replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status !== 'banned'" type="danger" size="small" text @click="handleBan(row)">封禁</el-button>
          <el-button v-else type="success" size="small" text @click="handleUnban(row)">解封</el-button>
          <el-button v-if="row.role !== 'admin'" type="warning" size="small" text @click="handleSetAdmin(row)">设为管理员</el-button>
          <el-button v-else-if="row.id !== 2" type="info" size="small" text @click="handleRemoveAdmin(row)">取消管理员</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > 0"
      class="pagination"
      background
      layout="total, prev, pager, next"
      :total="total"
      :page-size="pageSize"
      v-model:current-page="page"
      @current-change="fetchData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getUsers, updateUserStatus } from '@/api/users'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref<any[]>([])
const loading = ref(false)
const keyword = ref('')
const roleFilter = ref('')
const page = ref(1)
const pageSize = 10
const total = ref(0)

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getUsers({ page: page.value, limit: pageSize, keyword: keyword.value || undefined, role: roleFilter.value || undefined })
    list.value = res.users || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

const handleBan = async (row: any) => {
  await ElMessageBox.confirm(`确定封禁用户「${row.username}」？`, '封禁确认', { type: 'warning' })
  await updateUserStatus(row.id, { status: 'banned' })
  ElMessage.success('已封禁')
  fetchData()
}

const handleUnban = async (row: any) => {
  await updateUserStatus(row.id, { status: 'active' })
  ElMessage.success('已解封')
  fetchData()
}

const handleSetAdmin = async (row: any) => {
  await ElMessageBox.confirm(`确定将「${row.username}」设为管理员？`, '确认', { type: 'warning' })
  await updateUserStatus(row.id, { role: 'admin' })
  ElMessage.success('已设为管理员')
  fetchData()
}

const handleRemoveAdmin = async (row: any) => {
  await updateUserStatus(row.id, { role: 'user' })
  ElMessage.success('已取消管理员')
  fetchData()
}

onMounted(fetchData)
</script>

<style scoped>
.page-container { background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); }
.filter-bar { display: flex; gap: 12px; margin-bottom: 20px; align-items: center; }
.pagination { margin-top: 20px; display: flex; justify-content: flex-end; }
:deep(.el-button--primary) { background: #E8A87C; border-color: #E8A87C; }
:deep(.el-button--primary:hover) { background: #D4A574; border-color: #D4A574; }
</style>
