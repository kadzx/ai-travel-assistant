<template>
  <view class="index-page">
    <!-- Header: 推荐/关注 + 搜索/通知 -->
    <view class="header-wrap">
      <view class="h-[var(--status-bar-height)]"></view>
      <view class="header-inner">
        <!-- 左侧 Tabs -->
        <view class="tab-row">
          <view
            v-for="(tab, index) in tabs"
            :key="index"
            class="tab-item"
            :class="{ active: currentTab === index }"
            @click="handleTabChange(index)"
          >
            <text>{{ tab.name }}</text>
            <view v-if="currentTab === index" class="tab-indicator"></view>
          </view>
        </view>
        <!-- 右侧图标 -->
        <view class="header-icons">
          <view class="icon-btn" @click="goSearch">
            <u-icon name="search" size="22" color="#3D3D3D"></u-icon>
          </view>
          <view class="icon-btn relative" @click="goNotification">
            <u-icon name="bell" size="22" color="#3D3D3D"></u-icon>
            <view v-if="unreadCount > 0" class="noti-dot"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 瀑布流 -->
    <view class="feed-area">
      <!-- 首次加载骨架屏 -->
      <view v-if="flowList.length === 0 && loadStatus === 'loading'" class="masonry-columns">
        <view class="masonry-col">
          <view v-for="i in 3" :key="'skl-'+i" class="skeleton-card">
            <view class="skeleton-img" :style="{ height: (i % 2 === 0 ? '200px' : '260px') }"></view>
            <view style="padding:10px;">
              <view class="skeleton-line" style="width:80%;height:14px;margin-bottom:8px;"></view>
              <view style="display:flex;align-items:center;gap:6px;">
                <view class="skeleton-circle" style="width:20px;height:20px;"></view>
                <view class="skeleton-line" style="width:50px;height:10px;"></view>
              </view>
            </view>
          </view>
        </view>
        <view class="masonry-col">
          <view v-for="i in 3" :key="'skr-'+i" class="skeleton-card">
            <view class="skeleton-img" :style="{ height: (i % 2 === 0 ? '240px' : '180px') }"></view>
            <view style="padding:10px;">
              <view class="skeleton-line" style="width:70%;height:14px;margin-bottom:8px;"></view>
              <view style="display:flex;align-items:center;gap:6px;">
                <view class="skeleton-circle" style="width:20px;height:20px;"></view>
                <view class="skeleton-line" style="width:40px;height:10px;"></view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 真实瀑布流 -->
      <view v-else class="masonry-columns">
        <view class="masonry-col">
          <view v-for="item in leftList" :key="item.id">
            <MasonryItem :item="item" @click="handleItemClick" @like="handleLike" />
          </view>
        </view>
        <view class="masonry-col">
          <view v-for="item in rightList" :key="item.id">
            <MasonryItem :item="item" @click="handleItemClick" @like="handleLike" />
          </view>
        </view>
      </view>

      <view class="py-6">
        <u-loadmore
          :status="loadStatus"
          lineColor="rgba(0,0,0,0.06)"
          color="#BFBFBF"
          fontSize="12"
          :icon="true"
        />
      </view>
    </view>

    <!-- 自定义 TabBar -->
    <custom-tabbar current="/pages/index/index" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { onShow, onReachBottom, onPullDownRefresh as onPullDownRefreshHook } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import MasonryItem, { type MasonryItemProps } from '@/components/masonry-item/masonry-item.vue';
import { getPosts } from '@/api/post';
import { getUnreadCount } from '@/api/notification';
import { useUserStore } from '@/stores/user';
import { getStoredLang } from '@/locale';
// @ts-ignore
import ULoadmore from 'uview-plus/components/u-loadmore/u-loadmore.vue';
// @ts-ignore
import UIcon from 'uview-plus/components/u-icon/u-icon.vue';

const userStore = useUserStore();
const { t } = useI18n();
const unreadCount = ref(0);

const NOTIFY_POLL_INTERVAL = 20000;
let notifyPollTimer: ReturnType<typeof setInterval> | null = null;

async function fetchUnreadCount(silent = false) {
  if (!userStore.token) return;
  const prev = unreadCount.value;
  try {
    const res = await getUnreadCount();
    const next = res?.count ?? 0;
    if (!silent && next > prev && prev >= 0) {
      uni.showToast({ title: t('index.newNotification'), icon: 'none' });
    }
    unreadCount.value = next;
  } catch (_) {
    unreadCount.value = 0;
  }
}

function startNotifyPoll() {
  if (notifyPollTimer) return;
  notifyPollTimer = setInterval(() => fetchUnreadCount(false), NOTIFY_POLL_INTERVAL);
}

function stopNotifyPoll() {
  if (notifyPollTimer) { clearInterval(notifyPollTimer); notifyPollTimer = null; }
}

const tabs = computed(() => [{ name: t('index.recommend') }, { name: t('index.following') }]);
const currentTab = ref(0);
const loadStatus = ref('loadmore');
const leftList = ref<MasonryItemProps[]>([]);
const rightList = ref<MasonryItemProps[]>([]);
const flowList = ref<MasonryItemProps[]>([]);
const page = ref(1);
const limit = 10;

const handleTabChange = (index: number) => {
  if (currentTab.value === index) return;
  currentTab.value = index;
  flowList.value = []; leftList.value = []; rightList.value = [];
  page.value = 1;
  loadData();
};

const goSearch = () => { uni.navigateTo({ url: '/pages/search/search' }); };
const goNotification = () => { uni.navigateTo({ url: '/pages/notification/list' }); };

const handlePostUpdate = (data: any) => {
  if (data.type === 'like') {
    [flowList.value, leftList.value, rightList.value].forEach(list => {
      const t = list.find(item => String(item.id) === String(data.id));
      if (t) { t.isLiked = data.value; t.likes = data.count; }
    });
  }
};

const handleLike = (item: any) => {
  uni.$emit('postUpdate', { type: 'like', id: item.id, value: item.isLiked, count: Number(item.likes) });
};

const loadData = async () => {
  loadStatus.value = 'loading';
  try {
    const params: any = { page: page.value, limit, lang: getStoredLang() };
    if (currentTab.value === 1) params.feed = 'following';
    const res: any = await getPosts(params);
    if (res && res.list) {
      const typeLabels: Record<string, string> = { recommend: t('typeLabels.recommend'), nearby: t('typeLabels.nearby'), food: t('typeLabels.food'), travel: t('typeLabels.travel'), beauty: t('typeLabels.beauty') };
      const newPosts = res.list.map((p: any) => ({
        id: p.id,
        image: p.image || 'https://via.placeholder.com/300x400',
        title: p.title,
        type: p.type,
        typeLabel: typeLabels[p.type] || p.type,
        tags: p.tags || [],
        user: { id: p.user?.id, name: p.user?.name, avatar: p.user?.avatar || '/static/logo.png' },
        likes: p.likes,
        isLiked: p.isLiked
      }));
      newPosts.forEach((post: MasonryItemProps) => {
        if (leftList.value.length <= rightList.value.length) leftList.value.push(post);
        else rightList.value.push(post);
      });
      flowList.value = [...flowList.value, ...newPosts];
      if (res.totalPages == null || page.value >= res.totalPages) loadStatus.value = 'nomore';
      else { loadStatus.value = 'loadmore'; page.value++; }
    } else if (currentTab.value === 1 && (!res || !res.list || res.list.length === 0)) {
      loadStatus.value = 'nomore';
    }
  } catch (error) {
    console.error('Load posts failed:', error);
    loadStatus.value = 'loadmore';
  }
};

const handleItemClick = (item: MasonryItemProps) => {
  uni.navigateTo({ url: `/pages/post/detail?id=${item.id}` });
};

const onPullDownRefresh = async () => {
  flowList.value = []; leftList.value = []; rightList.value = [];
  page.value = 1;
  await loadData();
  uni.stopPullDownRefresh();
};

onMounted(() => {
  loadData();
  fetchUnreadCount(true);
  startNotifyPoll();
  uni.$on('postUpdate', handlePostUpdate);
});

onShow(() => { fetchUnreadCount(true); });

onUnmounted(() => {
  stopNotifyPoll();
  uni.$off('postUpdate', handlePostUpdate);
});

onReachBottom(() => { loadData(); });
onPullDownRefreshHook(onPullDownRefresh);
</script>

<style lang="scss" scoped>
.index-page {
  min-height: 100vh;
  background: #FFF8F0;
  padding-bottom: calc(60px + env(safe-area-inset-bottom));
}

/* ===== Header ===== */
.header-wrap {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #FFF8F0;
}
.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px 10px;
}

/* Tabs 左侧 */
.tab-row {
  display: flex;
  align-items: center;
  gap: 20px;
}
.tab-item {
  position: relative;
  font-size: 18px;
  font-weight: 500;
  color: #BFBFBF;
  padding-bottom: 4px;
  transition: all 0.25s;
  &.active {
    color: #3D3D3D;
    font-weight: 700;
    font-size: 19px;
  }
}
.tab-indicator {
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 18px;
  height: 3px;
  background: #E8A87C;
  border-radius: 2px;
}

/* 右侧图标 */
.header-icons {
  display: flex;
  align-items: center;
  gap: 6px;
}
.icon-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  &:active {
    background: rgba(0, 0, 0, 0.04);
    transform: scale(0.92);
  }
}
.noti-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: #FF6B6B;
  border-radius: 50%;
  border: 1.5px solid #FFF8F0;
}

/* ===== Feed ===== */
.feed-area {
  padding: 8px 8px 0;
}
.masonry-columns {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.masonry-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ===== 骨架屏 ===== */
@keyframes skeleton-pulse {
  0% { opacity: 0.4; }
  50% { opacity: 0.8; }
  100% { opacity: 0.4; }
}
.skeleton-card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.skeleton-img {
  background: linear-gradient(135deg, #F5EDE4, #FFF0E6, #F5EDE4);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
.skeleton-line {
  background: linear-gradient(135deg, #F5EDE4, #FFF0E6, #F5EDE4);
  border-radius: 6px;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
.skeleton-circle {
  border-radius: 50%;
  background: linear-gradient(135deg, #F5EDE4, #FFF0E6, #F5EDE4);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}
</style>
