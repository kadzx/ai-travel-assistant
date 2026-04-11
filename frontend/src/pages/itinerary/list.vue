<template>
  <view class="page-container">
    <!-- 毛玻璃顶栏 -->
    <view class="topbar">
      <view class="status-bar"></view>
      <view class="topbar-inner">
        <view class="back-btn" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="topbar-title">我的行程 🗺️</text>
        <view class="add-btn" @click="goToCreate">
          <text class="add-icon">+</text>
        </view>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="itineraryStore.loading && itineraryStore.list.length === 0" class="loading-wrap">
      <u-loading-icon mode="circle"></u-loading-icon>
    </view>

    <!-- 空状态 -->
    <view v-else-if="!itineraryStore.loading && itineraryStore.list.length === 0" class="empty-state">
      <view class="empty-illustration">
        <text class="emoji-group">🧳🗺️🧭</text>
      </view>
      <text class="empty-title">还没有行程呢~</text>
      <text class="empty-subtitle">用 AI 规划你的第一次旅行吧</text>
      <view class="empty-actions">
        <view class="btn-outline" @click="goToCreate">
          <text class="btn-outline-text">🔍 去探索</text>
        </view>
        <view class="btn-primary" @click="goToCreate">
          <text class="btn-primary-text">💬 和 AI 聊聊</text>
        </view>
      </view>
    </view>

    <!-- 行程卡片列表 -->
    <view v-else class="list-wrap">
      <view
        v-for="(item, index) in itineraryStore.list"
        :key="item.id"
        class="card-group"
      >
        <!-- 虚线连接（非第一个卡片才显示） -->
        <view v-if="index > 0" class="route-line">
          <view class="route-dot"></view>
          <view class="route-dot"></view>
          <view class="route-dot"></view>
        </view>

        <view class="trip-card" @click="goToDetail(item.id)">
          <!-- 卡片主体：左侧天数 + 右侧信息 -->
          <view class="card-body">
            <view class="days-block" :style="{ background: getDaysColor(index) }">
              <text class="days-num">{{ getDaysNum(item) }}</text>
              <text class="days-unit">天</text>
            </view>
            <view class="card-info">
              <text class="trip-title">{{ item.title || '未命名行程' }}</text>
              <view class="info-row">
                <text class="info-icon">⏱️</text>
                <text class="info-text">推荐游玩 {{ getDayCount(item) }} 天</text>
              </view>
              <view class="info-row">
                <text class="info-icon">📅</text>
                <text class="info-text">{{ formatDateShort(item) }}</text>
              </view>
            </view>
          </view>
          <!-- 进度条 -->
          <view class="progress-section">
            <view class="progress-bar-bg">
              <view class="progress-bar-fill" :style="{ width: getProgress(item) + '%' }"></view>
            </view>
            <text class="progress-text">{{ getProgressText(item) }}</text>
          </view>
          <!-- 下一站提示 -->
          <view v-if="getNodes(item).length > 0" class="next-spot">
            <text class="next-label">下一站：</text>
            <text class="next-name">{{ getNextSpot(item) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { useItineraryStore } from '@/stores/itinerary';

const itineraryStore = useItineraryStore();

function formatDateRange(start?: string, end?: string) {
  if (!start && !end) return '';
  if (start && end) return `${start} 至 ${end}`;
  return start || end || '';
}
function formatCreated(created: string) {
  if (!created) return '';
  return created.slice(0, 10);
}

function getDaysLabel(item: any) {
  if (item.days) {
    const nights = Math.max(item.days - 1, 0);
    return `${item.days}天${nights}夜`;
  }
  if (item.start_date && item.end_date) {
    const d1 = new Date(item.start_date);
    const d2 = new Date(item.end_date);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${diff}天${diff - 1}夜`;
  }
  return '行程';
}

function getDaysNum(item: any): number {
  if (item.days) return item.days;
  if (item.start_date && item.end_date) {
    const d1 = new Date(item.start_date);
    const d2 = new Date(item.end_date);
    return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }
  return 0;
}

const daysColors = ['#E8A87C', '#95B8A3', '#B8A9C9', '#7EC8C8', '#E8C07C', '#C09BD8'];
function getDaysColor(index: number) {
  return daysColors[index % daysColors.length];
}

function formatDateShort(item: any) {
  const fmt = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };
  if (item.start_date && item.end_date) return `${fmt(item.start_date)} - ${fmt(item.end_date)}`;
  if (item.start_date) return fmt(item.start_date);
  if (item.created_at) return item.created_at.slice(0, 10);
  return '';
}

function getNodes(item: any): any[] {
  return item?.content?.nodes || [];
}

function getDayCount(item: any): number {
  const nodes = getNodes(item);
  if (nodes.length === 0) return 1;
  const maxDay = Math.max(...nodes.map((n: any) => n.dayIndex || 1));
  return maxDay;
}

function getProgress(item: any) {
  const nodes = getNodes(item);
  if (!nodes.length) return 0;
  const done = nodes.filter((n: any) => n.status === 'done').length;
  return Math.round((done / nodes.length) * 100);
}

function getProgressText(item: any) {
  const nodes = getNodes(item);
  if (!nodes.length) return '暂无景点数据';
  const done = nodes.filter((n: any) => n.status === 'done').length;
  const pct = Math.round((done / nodes.length) * 100);
  return `已完成 ${done}/${nodes.length} 个景点  ${pct}%`;
}

function getNextSpot(item: any): string {
  const nodes = getNodes(item);
  const next = nodes.find((n: any) => n.status !== 'done' && n.status !== 'skipped');
  return next?.title || item.destination || '未知目的地';
}

onShow(() => {
  itineraryStore.getList();
});

const goBack = () => uni.navigateBack();

const goToDetail = (id: string | number) => {
  uni.navigateTo({ url: `/pages/itinerary/detail?id=${id}` });
};

const goToCreate = () => {
  uni.navigateTo({ url: '/pages/itinerary/create' });
};

const confirmDelete = (item: any) => {
  uni.showModal({
    title: '删除行程',
    content: `确定要删除「${item.title || '未命名行程'}」吗？此操作不可撤销。`,
    confirmColor: '#E8A87C',
    success: async (res) => {
      if (res.confirm) {
        try {
          await itineraryStore.removeItinerary(item.id);
          uni.showToast({ title: '已删除', icon: 'success' });
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    }
  });
};
</script>

<style lang="scss" scoped>
.page-container {
  min-height: 100vh;
  background-color: #FFF8F0;
  padding-bottom: 40px;
}

/* ===== 毛玻璃顶栏 ===== */
.topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 248, 240, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(232, 168, 124, 0.12);
}
.status-bar {
  height: var(--status-bar-height);
}
.topbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}
.back-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.04);
}
.back-icon {
  font-size: 22px;
  color: #333;
  line-height: 1;
  margin-top: -2px;
}
.topbar-title {
  font-size: 17px;
  font-weight: 700;
  color: #333;
}
.add-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  box-shadow: 0 2px 8px rgba(232, 168, 124, 0.35);
}
.add-icon {
  font-size: 22px;
  color: #fff;
  font-weight: 700;
  line-height: 1;
}

/* ===== 加载 ===== */
.loading-wrap {
  display: flex;
  justify-content: center;
  padding-top: 160px;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 100px;
}
.empty-illustration {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFF0E3, #FFE8D6);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
  animation: floatEmoji 3s ease-in-out infinite;
}
@keyframes floatEmoji {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.emoji-group {
  font-size: 36px;
  letter-spacing: 4px;
}
.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}
.empty-subtitle {
  font-size: 14px;
  color: #999;
  margin-bottom: 32px;
}
.empty-actions {
  display: flex;
  gap: 16px;
}
.btn-outline {
  padding: 10px 24px;
  border-radius: 999px;
  border: 1.5px solid #E8A87C;
  background: #fff;
}
.btn-outline-text {
  font-size: 14px;
  font-weight: 600;
  color: #E8A87C;
}
.btn-primary {
  padding: 10px 24px;
  border-radius: 999px;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  box-shadow: 0 4px 12px rgba(232, 168, 124, 0.3);
}
.btn-primary-text {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

/* ===== 列表 ===== */
.list-wrap {
  padding: 16px;
}

/* ===== 虚线连接 ===== */
.route-line {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 0;
}
.route-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #E8A87C;
  opacity: 0.5;
}

/* ===== 行程卡片 ===== */
.trip-card {
  background: #fff;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  position: relative;
  overflow: hidden;
}
.trip-card:active {
  transform: scale(0.985);
  transition: transform 0.15s;
}

/* 卡片主体 */
.card-body {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.days-block {
  width: 52px;
  min-width: 52px;
  height: 58px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.days-num {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
}
.days-unit {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
}
.card-info {
  flex: 1;
  min-width: 0;
}
.trip-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.info-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 2px;
}
.info-icon {
  font-size: 12px;
}
.info-text {
  font-size: 13px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 进度条 */
.progress-section {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.progress-bar-bg {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: #F0EBE5;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #95B8A3, #7EC8C8);
  transition: width 0.3s ease;
}
.progress-text {
  font-size: 12px;
  color: #95B8A3;
  white-space: nowrap;
  font-weight: 600;
}

/* 下一站 */
.next-spot {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #F0EBE5;
  display: flex;
  align-items: center;
  gap: 4px;
}
.next-label {
  font-size: 12px;
  color: #bbb;
}
.next-name {
  font-size: 12px;
  color: #E8A87C;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
