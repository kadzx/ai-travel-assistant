<template>
  <div class="page-container">
    <div class="filter-bar">
      <el-input v-model="keyword" placeholder="搜索评论内容" prefix-icon="Search" clearable style="width:280px;" @clear="fetchData" @keyup.enter="fetchData" />
      <el-button type="primary" @click="fetchData">搜索</el-button>
    </div>

    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="评论者" width="140">
        <template #default="{ row }">
          <div style="display:flex;align-items:center;gap:8px;">
            <el-avatar :size="28" :src="row.user?.avatar || undefined">{{ (row.user?.nickname || row.user?.username || '?')[0] }}</el-avatar>
            <span>{{ row.user?.nickname || row.user?.username }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="content" label="内容" min-width="300" show-overflow-tooltip />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.parent_id ? 'info' : ''">{{ row.parent_id ? '回复' : '主评论' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="目标" width="120">
        <template #default="{ row }">{{ row.target_type }} #{{ row.target_id }}</template>
      </el-table-column>
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ row.created_at?.slice(0, 16).replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button type="danger" size="small" text @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-if="total > 0" class="pagination" background layout="total, prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="page" @current-change="fetchData" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getComments, deleteComment } from '@/api/comments'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref<any[]>([])
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = 10
const total = ref(0)

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getComments({ page: page.value, limit: pageSize, keyword: keyword.value || undefined })
    list.value = res.comments || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm('确定删除该评论？', '删除确认', { type: 'warning' })
  await deleteComment(row.id)
  ElMessage.success('已删除')
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
