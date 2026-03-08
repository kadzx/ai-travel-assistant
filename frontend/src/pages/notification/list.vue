<template>
  <view class="min-h-screen bg-[#F6F7F9] flex flex-col">
    <!-- 小红书风格顶栏 -->
    <view class="sticky top-0 z-10 bg-[#F6F7F9]/95 border-b border-gray-200/50">
      <view class="h-[var(--status-bar-height)]"></view>
      <view class="px-4 py-3 flex items-center justify-between">
        <view class="w-10 h-10 flex items-center justify-center active:opacity-70" @click="goBack">
          <u-icon name="arrow-left" size="22" color="#333"></u-icon>
        </view>
        <text class="text-[17px] font-bold text-gray-900">通知</text>
        <view class="flex items-center gap-2">
          <text
            v-if="list.length > 0"
            class="text-[13px] text-[#FF2442] font-medium"
            @click="handleMarkAllRead"
          >全部已读</text>
          <view class="w-10 h-10"></view>
        </view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="flex-1"
      @scrolltolower="loadMore"
      :lower-threshold="80"
    >
      <view v-if="loading && list.length === 0" class="flex justify-center py-20">
        <u-loading-icon mode="circle"></u-loading-icon>
      </view>

      <view v-else-if="list.length === 0" class="flex flex-col items-center justify-center py-20 px-6">
        <view class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <u-icon name="bell" size="40" color="#d1d5db"></u-icon>
        </view>
        <text class="text-gray-500 text-[15px] text-center">暂无通知</text>
        <text class="text-gray-400 text-[13px] mt-2 text-center">点赞、评论、关注会在这里出现</text>
      </view>

      <view v-else class="px-3 py-4">
        <view
          v-for="item in list"
          :key="item.id"
          class="noti-card rounded-2xl bg-white shadow-sm mb-3 overflow-hidden flex items-center gap-3 p-4 active:scale-[0.99] transition-transform"
          :class="{ 'opacity-80': item.read_at }"
          @click="handleItemClick(item)"
        >
          <image
            :src="item.actor?.avatar || '/static/logo.png'"
            mode="aspectFill"
            class="rounded-full flex-shrink-0 bg-gray-100"
            style="width: 72rpx; height: 72rpx;"
          />
          <view class="flex-1 min-w-0 flex flex-col justify-center">
            <view class="flex items-center gap-2 flex-wrap">
              <text class="text-[15px] font-bold text-gray-900">{{ item.actor?.nickname || item.actor?.username || '用户' }}</text>
              <text class="text-[14px] text-gray-600">{{ typeText(item.type) }}</text>
            </view>
            <text v-if="item.extra?.contentSnippet" class="text-[13px] text-gray-500 mt-1 block line-clamp-2">{{ item.extra.contentSnippet }}</text>
            <text v-if="item.extra?.title && item.type === 'comment'" class="text-[12px] text-gray-400 mt-0.5 block">帖子：{{ item.extra.title }}</text>
            <text class="text-[11px] text-gray-400 mt-2 block">{{ formatTime(item.created_at) }}</text>
          </view>
          <view v-if="!item.read_at" class="w-2 h-2 rounded-full bg-[#FF2442] flex-shrink-0"></view>
        </view>
      </view>

      <view class="py-4 flex justify-center">
        <u-loadmore
          :status="loadStatus"
          lineColor="#E5E7EB"
          color="#9CA3AF"
          fontSize="12"
          :icon="true"
        />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getNotifications, markNotificationRead, markAllRead, type NotificationItem } from '@/api/notification';

const list = ref<NotificationItem[]>([]);
const loading = ref(false);
const loadStatus = ref<'loadmore' | 'loading' | 'nomore'>('loadmore');
const page = ref(1);
const limit = 20;

function typeText(type: string) {
  const map: Record<string, string> = {
    like: '赞了你',
    comment: '评论了你',
    follow: '关注了你'
  };
  return map[type] || type;
}

function formatTime(str: string) {
  if (!str) return '';
  const d = new Date(str);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
  return str.slice(0, 10);
}

const fetchList = async (append: boolean) => {
  if (loadStatus.value === 'loading') return;
  loadStatus.value = 'loading';
  if (!append) {
    page.value = 1;
    list.value = [];
  }
  try {
    const res = await getNotifications({ page: page.value, limit });
    const newList = res?.list ?? [];
    if (append) list.value = [...list.value, ...newList];
    else list.value = newList;
    if (!newList.length || newList.length < limit) loadStatus.value = 'nomore';
    else { loadStatus.value = 'loadmore'; page.value++; }
    setAllItemsRead();
  } catch (e) {
    loadStatus.value = 'loadmore';
    if (!append) list.value = [];
    uni.showToast({ title: '加载通知失败', icon: 'none' });
  }
};

function setAllItemsRead() {
  const t = new Date().toISOString();
  list.value.forEach(n => { n.read_at = t; });
}

const loadMore = () => {
  if (loadStatus.value !== 'loadmore') return;
  fetchList(true);
};

const handleItemClick = async (item: NotificationItem) => {
  if (!item.read_at) {
    try {
      await markNotificationRead(item.id);
      item.read_at = new Date().toISOString();
    } catch (_) {}
  }
  if (item.type === 'like' || item.type === 'comment') {
    if (item.target_type === 'post' && item.target_id) {
      uni.navigateTo({ url: `/pages/post/detail?id=${item.target_id}` });
    }
  } else if (item.type === 'follow' && item.actor?.id) {
    uni.navigateTo({ url: `/pages/user/home?id=${item.actor.id}` });
  }
};

const handleMarkAllRead = async () => {
  try {
    await markAllRead();
    setAllItemsRead();
    uni.showToast({ title: '已全部标为已读', icon: 'success' });
  } catch (_) {
    uni.showToast({ title: '操作失败', icon: 'none' });
  }
};

const goBack = () => uni.navigateBack();

onMounted(async () => {
  loading.value = true;
  try {
    await markAllRead();
    await fetchList(false);
  } catch (_) {}
  loading.value = false;
});

onShow(async () => {
  try {
    await markAllRead();
    if (list.value.length > 0) setAllItemsRead();
  } catch (_) {}
});
</script>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
