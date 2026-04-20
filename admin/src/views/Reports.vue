<template>
  <div class="page-container">
    <div class="filter-bar">
      <el-select v-model="statusFilter" placeholder="状态" clearable style="width:140px;" @change="fetchData">
        <el-option label="待处理" value="pending" />
        <el-option label="已处理" value="resolved" />
        <el-option label="已驳回" value="dismissed" />
      </el-select>
      <el-button type="primary" @click="fetchData">筛选</el-button>
    </div>

    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="举报者" width="140">
        <template #default="{ row }">
          <div style="display:flex;align-items:center;gap:8px;">
            <el-avatar :size="28" :src="row.reporter?.avatar || undefined">{{ (row.reporter?.nickname || row.reporter?.username || '?')[0] }}</el-avatar>
            <span>{{ row.reporter?.nickname || row.reporter?.username }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.target_type === 'post' ? '' : row.target_type === 'comment' ? 'info' : 'warning'">
            {{ targetTypeMap[row.target_type] || row.target_type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="目标ID" width="80">
        <template #default="{ row }">#{{ row.target_id }}</template>
      </el-table-column>
      <el-table-column prop="reason" label="原因" width="120" />
      <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="时间" width="170">
        <template #default="{ row }">{{ row.created_at?.slice(0, 16).replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <template v-if="row.status === 'pending'">
            <el-button type="success" size="small" text @click="handleResolve(row)">处理</el-button>
            <el-button type="info" size="small" text @click="handleDismiss(row)">驳回</el-button>
          </template>
          <span v-else style="color:#ccc;font-size:13px;">已处理</span>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-if="total > 0" class="pagination" background layout="total, prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="page" @current-change="fetchData" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getReports, updateReport } from '@/api/reports'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref<any[]>([])
const loading = ref(false)
const statusFilter = ref('')
const page = ref(1)
const pageSize = 10
const total = ref(0)

const targetTypeMap: Record<string, string> = { post: '帖子', comment: '评论', user: '用户' }
const statusLabel = (s: string) => ({ pending: '待处理', resolved: '已处理', dismissed: '已驳回' }[s] || s)
const statusType = (s: string) => ({ pending: 'warning', resolved: 'success', dismissed: 'info' }[s] || '')

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getReports({ page: page.value, limit: pageSize, status: statusFilter.value || undefined })
    list.value = res.reports || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

const handleResolve = async (row: any) => {
  await ElMessageBox.confirm('确认处理该举报？', '处理确认', { type: 'warning' })
  await updateReport(row.id, { status: 'resolved' })
  ElMessage.success('已处理')
  fetchData()
}

const handleDismiss = async (row: any) => {
  await updateReport(row.id, { status: 'dismissed' })
  ElMessage.success('已驳回')
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
