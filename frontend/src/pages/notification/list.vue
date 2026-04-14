<template>
  <view class="min-h-screen bg-[#FFF8F0] flex flex-col">
    <!-- 毛玻璃顶栏 -->
    <view class="sticky top-0 z-50 bg-[#FFF8F0]/80 backdrop-blur-2xl">
      <view class="h-[var(--status-bar-height)]"></view>
      <view class="px-4 py-3 flex items-center justify-between">
        <view class="w-10 h-10 flex items-center justify-center rounded-full bg-white/60 active:bg-white/80" @click="goBack">
          <text class="text-[18px]">←</text>
        </view>
        <text class="text-[17px] font-bold text-gray-800">通知</text>
        <view class="flex items-center">
          <text
            v-if="list.length > 0"
            class="text-[13px] text-[#E8A87C] font-medium"
            @click="handleMarkAllRead"
          >全部已读</text>
          <view v-else class="w-14"></view>
        </view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="flex-1"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
      @scrolltolower="loadMore"
      :lower-threshold="80"
    >
      <!-- Loading -->
      <view v-if="loading && list.length === 0" class="flex justify-center py-20">
        <u-loading-icon mode="circle" color="#E8A87C"></u-loading-icon>
      </view>

      <!-- 空状态 -->
      <view v-else-if="list.length === 0" class="flex flex-col items-center justify-center py-24 px-6">
        <view class="w-20 h-20 rounded-full bg-[#F5F0EB] flex items-center justify-center mb-4">
          <text class="text-[36px]">🔔</text>
        </view>
        <text class="text-gray-500 text-[15px]">暂无通知</text>
        <text class="text-gray-400 text-[13px] mt-2">互动消息会在这里出现</text>
      </view>

      <!-- 通知列表 -->
      <view v-else class="px-3 py-4">
        <view
          v-for="item in list"
          :key="item.id"
          class="noti-card bg-white mb-3 overflow-hidden flex items-center gap-3 p-4 active:scale-[0.99] transition-all"
          :class="{ 'noti-read': item.read_at }"
          @click="handleItemClick(item)"
        >
          <!-- 未读小圆点 -->
          <view v-if="!item.read_at" class="unread-dot w-2 h-2 rounded-full bg-[#E8A87C] flex-shrink-0 self-start mt-4"></view>
          <view v-else class="w-2 flex-shrink-0"></view>

          <!-- 头像 + 类型图标 -->
          <view class="relative flex-shrink-0">
            <image
              :src="item.actor?.avatar || '/static/logo.png'"
              mode="aspectFill"
              class="rounded-full bg-[#F5F0EB]"
              style="width: 80rpx; height: 80rpx;"
            />
            <view class="type-badge absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[11px]"
              :class="typeBadgeClass(item.type)"
            >
              {{ typeEmoji(item.type) }}
            </view>
          </view>

          <!-- 内容区 -->
          <view class="flex-1 min-w-0 flex flex-col justify-center">
            <view class="flex items-center gap-1.5 flex-wrap">
              <text class="text-[14px] font-bold text-gray-800">{{ item.actor?.nickname || item.actor?.username || '用户' }}</text>
              <text class="text-[13px] text-gray-500">{{ typeText(item.type) }}</text>
            </view>
            <text v-if="item.extra?.contentSnippet" class="text-[12px] text-gray-400 mt-1 block line-clamp-2">{{ item.extra.contentSnippet }}</text>
            <text v-if="item.extra?.title && item.type === 'comment'" class="text-[11px] text-gray-400 mt-0.5 block">帖子：{{ item.extra.title }}</text>
            <text class="text-[11px] text-gray-300 mt-1.5 block">{{ formatTime(item.created_at) }}</text>
          </view>

          <!-- 右侧缩略图 -->
          <image
            v-if="item.extra?.coverImage"
            :src="item.extra.coverImage"
            mode="aspectFill"
            class="w-[44px] h-[44px] rounded-xl flex-shrink-0 bg-[#F5F0EB]"
          />
        </view>
      </view>

      <view class="py-4 flex justify-center">
        <u-loadmore
          :status="loadStatus"
          lineColor="#F5F0EB"
          color="#C4A882"
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
const refreshing = ref(false);
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

function typeEmoji(type: string) {
  const map: Record<string, string> = { like: '❤️', comment: '💬', follow: '👤' };
  return map[type] || '📌';
}

function typeBadgeClass(type: string) {
  const map: Record<string, string> = {
    like: 'bg-[#FFF0E8]',
    comment: 'bg-[#EBF0F7]',
    follow: 'bg-[#EBF5EF]'
  };
  return map[type] || 'bg-gray-100';
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

const onRefresh = async () => {
  refreshing.value = true;
  await fetchList(false);
  refreshing.value = false;
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
.noti-card {
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.noti-read {
  opacity: 0.7;
}

.unread-dot {
  box-shadow: 0 0 6px rgba(232, 168, 124, 0.5);
}

.type-badge {
  border: 2px solid white;
}

.line-clamp-2 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
</style>
