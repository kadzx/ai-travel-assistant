<template>
  <div class="dashboard" v-loading="loading">
    <div class="stat-cards">
      <div v-for="card in statCards" :key="card.label" class="stat-card" :style="{ borderColor: card.color }">
        <div class="stat-icon" :style="{ background: card.bg }">{{ card.icon }}</div>
        <div class="stat-info">
          <div class="stat-value">{{ card.value }}</div>
          <div class="stat-label">{{ card.label }}</div>
        </div>
        <div v-if="card.sub !== undefined" class="stat-sub">今日 +{{ card.sub }}</div>
      </div>
    </div>

    <div class="chart-row">
      <div class="chart-card">
        <h3>近 7 天趋势</h3>
        <v-chart :option="trendOption" autoresize style="height:320px;" />
      </div>
      <div class="chart-card chart-card-sm">
        <h3>帖子类型分布</h3>
        <v-chart :option="pieOption" autoresize style="height:320px;" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getDashboardStats } from '@/api/dashboard'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'

use([CanvasRenderer, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent])

const loading = ref(true)
const stats = ref<any>({})

const TYPE_LABELS: Record<string, string> = {
  recommend: '推荐', nearby: '附近', food: '美食', travel: '旅行', beauty: '彩妆', other: '其他'
}

const statCards = computed(() => [
  { icon: '👥', label: '总用户', value: stats.value.users ?? '-', sub: stats.value.todayUsers, color: '#E8A87C', bg: '#FFF0E6' },
  { icon: '📝', label: '总帖子', value: stats.value.posts ?? '-', sub: stats.value.todayPosts, color: '#95B8A3', bg: '#EBF5EF' },
  { icon: '💬', label: '总评论', value: stats.value.comments ?? '-', color: '#8BB8D4', bg: '#EBF0F7' },
  { icon: '🗺️', label: '总行程', value: stats.value.itineraries ?? '-', color: '#C4A0D4', bg: '#F3EBF7' },
  { icon: '⚠️', label: '待处理举报', value: stats.value.reportPending ?? '-', color: '#E87C7C', bg: '#FDECEC' },
])

const trendOption = computed(() => {
  const trend = stats.value.trend || []
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增用户', '新增帖子'], bottom: 0 },
    grid: { top: 20, right: 20, bottom: 40, left: 50 },
    xAxis: { type: 'category', data: trend.map((t: any) => t.date.slice(5)), axisLine: { lineStyle: { color: '#E0D6CC' } } },
    yAxis: { type: 'value', minInterval: 1, axisLine: { show: false }, splitLine: { lineStyle: { color: '#F5EDE4' } } },
    series: [
      { name: '新增用户', type: 'line', data: trend.map((t: any) => t.users), smooth: true, itemStyle: { color: '#E8A87C' }, areaStyle: { color: 'rgba(232,168,124,0.1)' } },
      { name: '新增帖子', type: 'line', data: trend.map((t: any) => t.posts), smooth: true, itemStyle: { color: '#95B8A3' }, areaStyle: { color: 'rgba(149,184,163,0.1)' } },
    ],
  }
})

const pieOption = computed(() => {
  const dist = stats.value.typeDistribution || []
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      data: dist.map((d: any) => ({ name: TYPE_LABELS[d.type] || d.type, value: d.count })),
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { fontSize: 12 },
      color: ['#E8A87C', '#95B8A3', '#8BB8D4', '#C4A0D4', '#E8C87C', '#D48B8B'],
    }],
  }
})

onMounted(async () => {
  try {
    stats.value = await getDashboardStats()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.stat-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.03);
  border-left: 4px solid;
  position: relative;
}
.stat-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.stat-value { font-size: 24px; font-weight: 700; color: #3D3028; }
.stat-label { font-size: 13px; color: #BFBFBF; margin-top: 2px; }
.stat-sub { position: absolute; top: 12px; right: 16px; font-size: 12px; color: #95B8A3; font-weight: 500; }
.chart-row { display: grid; grid-template-columns: 1fr 380px; gap: 16px; }
.chart-card { background: #fff; border-radius: 16px; padding: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.03); }
.chart-card h3 { font-size: 15px; color: #3D3028; margin-bottom: 12px; font-weight: 600; }
@media (max-width: 900px) { .chart-row { grid-template-columns: 1fr; } }
</style>
