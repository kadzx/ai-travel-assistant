<template>
  <view class="container min-h-screen bg-[#F6F7F9] pb-24">
    <!-- 小红书风格顶栏 -->
    <view class="sticky top-0 z-10 bg-[#F6F7F9]/95 border-b border-gray-200/50">
      <view class="h-[var(--status-bar-height)]"></view>
      <view class="px-4 py-3 flex items-center justify-between">
        <view class="w-10 h-10 flex items-center justify-center active:opacity-70" @click="goBack">
          <u-icon name="arrow-left" size="22" color="#333"></u-icon>
        </view>
        <text class="text-[17px] font-bold text-gray-900">我的行程</text>
        <view class="w-10 h-10"></view>
      </view>
    </view>

    <view class="px-3 py-4">
      <view
        v-for="item in itineraryStore.list"
        :key="item.id"
        class="card rounded-2xl bg-white shadow-sm mb-3 overflow-hidden active:scale-[0.99] transition-transform"
        @click="goToDetail(item.id)"
      >
        <view class="p-4">
          <text class="text-[17px] font-bold text-gray-900 block mb-2 line-clamp-1">{{ item.title || '未命名行程' }}</text>
          <view class="flex items-center gap-2 text-[13px] text-gray-500">
            <text v-if="item.start_date || item.end_date">
              {{ formatDateRange(item.start_date, item.end_date) }}
            </text>
            <text v-else class="text-gray-400">{{ item.created_at ? formatCreated(item.created_at) : '' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="!itineraryStore.loading && itineraryStore.list.length === 0" class="empty flex flex-col items-center justify-center py-20">
      <view class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <u-icon name="map" size="40" color="#d1d5db"></u-icon>
      </view>
      <text class="text-gray-500 text-[15px]">暂无行程</text>
      <text class="text-gray-400 text-[13px] mt-1">用 AI 生成你的第一份旅行计划吧</text>
      <view
        class="mt-6 px-6 py-3 rounded-full bg-[#FF2442] active:scale-95 transition-transform"
        @click="goToCreate"
      >
        <text class="text-white text-[15px] font-bold">创建行程</text>
      </view>
    </view>

    <view v-if="itineraryStore.loading && itineraryStore.list.length === 0" class="flex justify-center py-20">
      <u-loading-icon mode="circle"></u-loading-icon>
    </view>

    <!-- 小红书风格 FAB -->
    <view
      class="fab-btn rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      @click="goToCreate"
    >
      <u-icon name="plus" color="#fff" size="24" :bold="true"></u-icon>
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
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
}
.card {
  border: 1px solid rgba(0, 0, 0, 0.04);
}
.empty {
  min-height: 200px;
}
.fab-btn {
  position: fixed;
  right: 20px;
  bottom: calc(20px + env(safe-area-inset-bottom));
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #FF2442 0%, #FF6B6B 100%);
  box-shadow: 0 4px 14px rgba(255, 36, 66, 0.35);
}
.line-clamp-1 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
