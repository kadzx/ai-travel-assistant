<template>
  <div class="page-container">
    <div class="filter-bar">
      <el-input v-model="keyword" placeholder="搜索标题/内容" prefix-icon="Search" clearable style="width:280px;" @clear="fetchData" @keyup.enter="fetchData" />
      <el-select v-model="typeFilter" placeholder="类型" clearable style="width:120px;" @change="fetchData">
        <el-option v-for="t in types" :key="t.value" :label="t.label" :value="t.value" />
      </el-select>
      <el-button type="primary" @click="fetchData">搜索</el-button>
    </div>

    <el-table :data="list" v-loading="loading" stripe>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column label="封面" width="80">
        <template #default="{ row }">
          <el-image v-if="row.images?.length" :src="row.images[0]" style="width:50px;height:50px;border-radius:8px;" fit="cover" :preview-src-list="row.images" />
          <span v-else style="color:#ccc;">无</span>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
      <el-table-column label="作者" width="130">
        <template #default="{ row }">{{ row.user?.nickname || row.user?.username || '-' }}</template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }">
          <el-tag size="small">{{ typeMap[row.type] || row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="likesCount" label="点赞" width="70" />
      <el-table-column prop="commentsCount" label="评论" width="70" />
      <el-table-column label="发布时间" width="170">
        <template #default="{ row }">{{ row.created_at?.slice(0, 16).replace('T', ' ') }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button type="info" size="small" text @click="previewPost = row">查看</el-button>
          <el-button type="danger" size="small" text @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination v-if="total > 0" class="pagination" background layout="total, prev, pager, next" :total="total" :page-size="pageSize" v-model:current-page="page" @current-change="fetchData" />

    <el-dialog v-model="showPreview" title="帖子详情" width="600px">
      <template v-if="previewPost">
        <h3 style="margin-bottom:12px;">{{ previewPost.title }}</h3>
        <div v-if="previewPost.images?.length" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          <el-image v-for="(img, i) in previewPost.images" :key="i" :src="img" style="width:120px;height:120px;border-radius:8px;" fit="cover" :preview-src-list="previewPost.images" />
        </div>
        <p style="color:#666;line-height:1.8;white-space:pre-wrap;">{{ previewPost.content }}</p>
        <div style="margin-top:12px;color:#999;font-size:13px;">
          作者：{{ previewPost.user?.nickname || previewPost.user?.username }} | 发布于 {{ previewPost.created_at?.slice(0, 16).replace('T', ' ') }}
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getPosts, deletePost } from '@/api/posts'
import { ElMessage, ElMessageBox } from 'element-plus'

const list = ref<any[]>([])
const loading = ref(false)
const keyword = ref('')
const typeFilter = ref('')
const page = ref(1)
const pageSize = 10
const total = ref(0)
const previewPost = ref<any>(null)
const showPreview = computed({ get: () => !!previewPost.value, set: (v) => { if (!v) previewPost.value = null } })

const typeMap: Record<string, string> = { recommend: '推荐', nearby: '附近', food: '美食', travel: '旅行', beauty: '彩妆' }
const types = Object.entries(typeMap).map(([value, label]) => ({ value, label }))

const fetchData = async () => {
  loading.value = true
  try {
    const res: any = await getPosts({ page: page.value, limit: pageSize, keyword: keyword.value || undefined, type: typeFilter.value || undefined })
    list.value = res.posts || []
    total.value = res.total || 0
  } finally {
    loading.value = false
  }
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm(`确定删除帖子「${row.title}」？此操作不可撤销。`, '删除确认', { type: 'warning' })
  await deletePost(row.id)
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
