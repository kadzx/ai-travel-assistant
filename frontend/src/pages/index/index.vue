<template>
  <view class="container min-h-screen bg-[#F6F7F9] flex flex-col pb-safe">
    <!-- Header Area（无系统栏，自定义样式） -->
    <view class="sticky top-0 z-50 header-wrap">
      <view class="h-[var(--status-bar-height)]"></view>
      <view class="px-4 py-3 flex items-center justify-between header-inner">
        <view class="flex items-center gap-3 active:opacity-80 transition-opacity" @click="scrollToTop">
          <view class="logo-box">
            <text class="logo-text">A</text>
          </view>
          <text class="header-title">AI Travel</text>
        </view>
        <view class="flex items-center gap-2">
          <view class="icon-btn" @click="goSearch">
            <u-icon name="search" size="20" color="#333"></u-icon>
          </view>
          <view class="icon-btn relative" @click="goNotification">
            <u-icon name="bell" size="20" color="#333"></u-icon>
            <view class="icon-dot"></view>
          </view>
        </view>
      </view>

      <!-- Tabs -->
      <view class="flex items-center gap-6 px-2">
        <view
          v-for="(tab, index) in tabs"
          :key="index"
          class="text-[16px] font-medium transition-all relative py-2"
          :class="currentTab === index ? 'text-gray-900 font-bold scale-105' : 'text-gray-400'"
          @click="handleTabChange(index)"
        >
          <text>{{ tab.name }}</text>
          <view
            v-if="currentTab === index"
            class="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-[3px] bg-[#FF2442] rounded-full"
          ></view>
        </view>
      </view>
    </view>

    <!-- Main Feed -->
    <view class="flex-1 px-2 pt-3">
      <!-- Masonry Layout -->
      <view class="flex gap-2 items-start">
        <!-- Left Column -->
        <view class="flex-1 flex flex-col gap-2">
           <view v-for="(item, index) in leftList" :key="item.id" class="w-full">
            <MasonryItem :item="item" @click="handleItemClick" />
          </view>
        </view>
        <!-- Right Column -->
        <view class="flex-1 flex flex-col gap-2">
           <view v-for="(item, index) in rightList" :key="item.id" class="w-full">
            <MasonryItem :item="item" @click="handleItemClick" />
          </view>
        </view>
      </view>
      
      <!-- Loading State -->
      <view class="py-6">
        <u-loadmore 
          :status="loadStatus" 
          lineColor="#E5E7EB" 
          color="#9CA3AF"
          fontSize="12"
          :icon="true"
        />
      </view>
    </view>

    <!-- Floating Action Button (FAB) -->
    <view 
      class="fixed bottom-safe-8 right-5 z-40 group"
      @click="handleCreate"
    >
      <view class="w-14 h-14 bg-black rounded-full shadow-float flex items-center justify-center transform transition-all duration-300 active:scale-90 hover:shadow-black/30 group-hover:-translate-y-1 border border-white/10">
        <u-icon name="plus" color="#ffffff" size="24" :bold="true"></u-icon>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { onReachBottom, onPullDownRefresh as onPullDownRefreshHook } from '@dcloudio/uni-app';
import MasonryItem, { type MasonryItemProps } from '@/components/masonry-item/masonry-item.vue';
import { getPosts } from '@/api/post';
// @ts-ignore
import ULoadmore from 'uview-plus/components/u-loadmore/u-loadmore.vue';
// @ts-ignore
import UIcon from 'uview-plus/components/u-icon/u-icon.vue';

const tabs = [{ name: '推荐' }, { name: '关注' }];
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
  flowList.value = [];
  leftList.value = [];
  rightList.value = [];
  page.value = 1;
  loadData();
};

const goSearch = () => {
  uni.navigateTo({ url: '/pages/search/search' });
};

const goNotification = () => {
  uni.navigateTo({ url: '/pages/notification/list' });
};

// Event Listener for Post Updates (Like/Favorite)
const handlePostUpdate = (data: any) => {
  if (data.type === 'like') {
    // Update flowList
    const target = flowList.value.find(item => String(item.id) === String(data.id));
    if (target) {
      target.isLiked = data.value;
      target.likes = data.count;
    }
    // Update leftList
    const leftTarget = leftList.value.find(item => String(item.id) === String(data.id));
    if (leftTarget) {
      leftTarget.isLiked = data.value;
      leftTarget.likes = data.count;
    }
    // Update rightList
    const rightTarget = rightList.value.find(item => String(item.id) === String(data.id));
    if (rightTarget) {
      rightTarget.isLiked = data.value;
      rightTarget.likes = data.count;
    }
  }
};

const loadData = async () => {
  loadStatus.value = 'loading';
  try {
    const params: any = { page: page.value, limit };
    if (currentTab.value === 1) params.feed = 'following';
    const res: any = await getPosts(params);
    if (res && res.list) {
      const typeLabels: Record<string, string> = { recommend: '推荐', nearby: '附近', food: '美食', travel: '旅行', beauty: '彩妆' };
      const newPosts = res.list.map((p: any) => ({
        id: p.id,
        image: p.image || 'https://via.placeholder.com/300x400',
        title: p.title,
        type: p.type,
        typeLabel: typeLabels[p.type] || p.type,
        tags: p.tags || [],
        user: {
          id: p.user?.id,
          name: p.user?.name,
          avatar: p.user?.avatar || '/static/logo.png'
        },
        likes: p.likes,
        isLiked: p.isLiked
      }));
      
      // Distribute to columns
      newPosts.forEach((post: MasonryItemProps, index: number) => {
        if (leftList.value.length <= rightList.value.length) {
          leftList.value.push(post);
        } else {
          rightList.value.push(post);
        }
      });
      
      flowList.value = [...flowList.value, ...newPosts];

      if (res.totalPages == null || page.value >= res.totalPages) {
        loadStatus.value = 'nomore';
      } else {
        loadStatus.value = 'loadmore';
        page.value++;
      }
    } else if (currentTab.value === 1 && (!res || !res.list || res.list.length === 0)) {
      loadStatus.value = 'nomore';
    }
  } catch (error) {
    console.error('Load posts failed:', error);
    loadStatus.value = 'loadmore';
  }
};

const handleItemClick = (item: MasonryItemProps) => {
  console.log('Clicked:', item);
  uni.navigateTo({
    url: `/pages/post/detail?id=${item.id}`
  });
};

const handleCreate = () => {
  uni.navigateTo({
    url: '/pages/post/create'
  });
};

const scrollToTop = () => {
  uni.pageScrollTo({
    scrollTop: 0,
    duration: 300
  });
};

const onPullDownRefresh = async () => {
  flowList.value = [];
  leftList.value = [];
  rightList.value = [];
  page.value = 1;
  await loadData();
  uni.stopPullDownRefresh();
};

onMounted(() => {
  loadData();
  uni.$on('postUpdate', handlePostUpdate);
});

onUnmounted(() => {
  uni.$off('postUpdate', handlePostUpdate);
});

onReachBottom(() => {
  loadData();
});

onPullDownRefreshHook(onPullDownRefresh);
</script>

<style lang="scss" scoped>
/* Hide scrollbar */
::-webkit-scrollbar {
  display: none;
  width: 0 !important;
  height: 0 !important;
  -webkit-appearance: none;
  background: transparent;
}

.bottom-safe-8 {
  bottom: calc(2rem + env(safe-area-inset-bottom));
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 首页头部 */
.header-wrap {
  background: linear-gradient(180deg, #fff 0%, #f8f9fa 100%);
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.header-inner {
  min-height: 48px;
}
.logo-box {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #FF2442 0%, #FF5E7D 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(255, 36, 66, 0.25);
}
.logo-text {
  color: #fff;
  font-size: 18px;
  font-weight: 800;
}
.header-title {
  font-size: 20px;
  font-weight: 800;
  color: #1a1a1a;
  letter-spacing: -0.5px;
}
.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  transition: transform 0.2s;
  &:active {
    transform: scale(0.95);
  }
}
.icon-dot {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  background: #FF2442;
  border-radius: 50%;
  border: 2px solid #fff;
}
</style>
