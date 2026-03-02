<template>
  <view class="container min-h-screen bg-[#F6F7F9] flex flex-col pb-safe">
    <!-- Header Area -->
    <view class="sticky top-0 z-50 bg-[#F6F7F9]/95 backdrop-blur-xl border-b border-gray-200/50 transition-all duration-300">
      <!-- Status Bar Placeholder -->
      <view class="h-[var(--status-bar-height)]"></view>
      
      <!-- Top Bar -->
      <view class="px-4 py-3 flex items-center justify-between">
        <!-- Logo / Title -->
        <view class="flex items-center gap-2 active:opacity-80 transition-opacity" @click="scrollToTop">
          <view class="w-8 h-8 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
            <text class="text-white font-bold text-lg">A</text>
          </view>
          <text class="text-xl font-extrabold text-gray-900 tracking-tight">AI Travel</text>
        </view>

        <!-- Right Actions -->
        <view class="flex items-center gap-3">
          <view class="w-9 h-9 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm active:scale-90 transition-transform">
            <u-icon name="search" size="20" color="#333"></u-icon>
          </view>
          <view class="w-9 h-9 bg-white rounded-full flex items-center justify-center border border-gray-100 shadow-sm relative active:scale-90 transition-transform">
            <u-icon name="bell" size="20" color="#333"></u-icon>
            <view class="absolute top-2 right-2.5 w-1.5 h-1.5 bg-[#FF2442] rounded-full ring-2 ring-white"></view>
          </view>
        </view>
      </view>

      <!-- Category Tabs -->
      <view class="pb-2">
        <scroll-view scroll-x class="whitespace-nowrap w-full" :show-scrollbar="false">
          <view class="flex items-center gap-6 px-4 h-10">
            <view 
              v-for="(cat, idx) in categories" 
              :key="idx"
              class="relative flex flex-col items-center justify-center h-full transition-all duration-300"
              @click="currentCat = idx"
            >
              <text 
                class="text-[15px] transition-all duration-300"
                :class="currentCat === idx ? 'text-black font-bold scale-110' : 'text-gray-400 font-medium'"
              >
                {{ cat }}
              </text>
              <!-- Active Indicator -->
              <view 
                class="absolute bottom-0 w-4 h-1 bg-[#FF2442] rounded-full transition-all duration-300 transform origin-center"
                :class="currentCat === idx ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'"
              ></view>
            </view>
          </view>
        </scroll-view>
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

const categories = ['推荐', '附近', '京都', '美食', '探店', '摄影', '亲子', '露营'];
const currentCat = ref(0);
const loadStatus = ref('loadmore');
const leftList = ref<MasonryItemProps[]>([]);
const rightList = ref<MasonryItemProps[]>([]);
const flowList = ref<MasonryItemProps[]>([]);
const page = ref(1);
const limit = 10;

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
    const res: any = await getPosts({ page: page.value, limit });
    if (res && res.list) {
      const newPosts = res.list.map((p: any) => ({
        id: p.id,
        image: p.image || 'https://via.placeholder.com/300x400',
        title: p.title,
        type: p.id % 3 === 0 ? 'HOT' : undefined, // Mock type for visual
        user: {
          name: p.user.name,
          avatar: p.user.avatar || '/static/logo.png'
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

      if (page.value >= res.totalPages) {
        loadStatus.value = 'nomore';
      } else {
        loadStatus.value = 'loadmore';
        page.value++;
      }
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
</style>
