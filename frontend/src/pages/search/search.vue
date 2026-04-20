<template>
  <view class="search-page min-h-screen bg-[#FFF8F0] flex flex-col">
    <!-- 奶油风顶栏 -->
    <view class="sticky top-0 z-50 bg-[#FFF8F0]/95 backdrop-blur-xl">
      <view class="h-[var(--status-bar-height)]"></view>
      <view class="px-4 py-3 flex items-center gap-3">
        <view class="flex-1 flex items-center bg-[#F5F0EB] rounded-full pl-4 pr-3 py-2.5">
          <text class="text-[16px] mr-2">🔍</text>
          <input
            v-model="keyword"
            class="flex-1 text-[15px] text-gray-800 bg-transparent"
            placeholder="搜索旅行目的地、攻略..."
            placeholder-class="text-gray-400"
            confirm-type="search"
            @input="onKeywordInput"
            @confirm="onSearchConfirm"
          />
          <view v-if="keyword" class="w-5 h-5 rounded-full bg-gray-300/60 flex items-center justify-center ml-2" @click="clearKeyword">
            <text class="text-[10px] text-white font-bold">✕</text>
          </view>
        </view>
        <text class="text-[#E8A87C] text-[15px] font-medium" @click="goBack">取消</text>
      </view>
    </view>

    <scroll-view scroll-y class="flex-1" @scrolltolower="loadMore" :lower-threshold="100">
      <!-- 未搜索状态：搜索历史 + 热门搜索 + 推荐目的地 -->
      <view v-if="!searched" class="px-4 pt-4 pb-6">
        <!-- 搜索历史 -->
        <view v-if="searchHistory.length" class="mb-6">
          <view class="flex items-center justify-between mb-3">
            <text class="text-[15px] font-bold text-gray-800">搜索历史</text>
            <text class="text-[13px] text-gray-400" @click="clearHistory">🗑 清除</text>
          </view>
          <view class="flex flex-wrap gap-2">
            <view
              v-for="(h, i) in searchHistory"
              :key="i"
              class="px-4 py-1.5 bg-white rounded-full shadow-sm"
              @click="onHistoryClick(h)"
            >
              <text class="text-[13px] text-gray-600">{{ h }}</text>
            </view>
          </view>
        </view>

        <!-- 热门搜索 -->
        <view class="mb-6">
          <text class="text-[15px] font-bold text-gray-800 mb-3 block">🔥 热门搜索</text>
          <view class="hot-grid">
            <view
              v-for="(item, index) in hotSearches"
              :key="index"
              class="flex items-center gap-2 py-2"
              @click="onHotClick(item)"
            >
              <view
                class="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                :class="index < 3 ? 'hot-rank-top' : 'bg-gray-200 text-gray-500'"
              >
                {{ index + 1 }}
              </view>
              <text class="text-[14px] text-gray-700 truncate">{{ item }}</text>
            </view>
          </view>
        </view>

        <!-- 推荐目的地 -->
        <view>
          <text class="text-[15px] font-bold text-gray-800 mb-3 block">🌍 推荐目的地</text>
          <scroll-view scroll-x class="whitespace-nowrap" :show-scrollbar="false">
            <view class="inline-flex gap-3 pb-2">
              <view
                v-for="(city, i) in recommendCities"
                :key="i"
                class="flex-shrink-0 w-[90px] rounded-2xl flex flex-col items-center justify-center py-4"
                :style="{ background: city.bg }"
                @click="onCityClick(city.name)"
              >
                <text class="text-[28px] mb-1">{{ city.emoji }}</text>
                <text class="text-[13px] text-gray-800 font-semibold">{{ city.name }}</text>
                <text class="text-[10px] text-gray-400 mt-0.5">{{ city.country }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>

      <!-- 搜索中 loading -->
      <view v-else-if="loading && list.length === 0" class="flex justify-center py-20">
        <u-loading-icon mode="circle" color="#E8A87C"></u-loading-icon>
      </view>

      <!-- 无结果 -->
      <view v-else-if="list.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <text class="text-[48px] mb-3">🔍</text>
        <text class="text-[15px] text-gray-500">暂无搜索结果</text>
        <text class="text-[13px] text-gray-400 mt-1">换个关键词试试吧</text>
      </view>

      <!-- 搜索结果瀑布流 -->
      <view v-else class="px-2 py-3 flex gap-2 items-start">
        <view class="flex-1 flex flex-col gap-2">
          <view v-for="(item, index) in leftList" :key="item.id" @click="goDetail(item.id)">
            <view class="bg-white rounded-2xl overflow-hidden shadow-sm">
              <image
                :src="getDisplayImageUrl(item.image) || 'https://via.placeholder.com/300x400'"
                mode="widthFix"
                class="w-full block"
                style="min-height: 120px;"
              />
              <view class="p-3">
                <text class="text-[14px] font-medium text-gray-800 line-clamp-2">{{ item.title }}</text>
                <view v-if="item.tags && item.tags.length" class="flex flex-wrap gap-1 mt-2">
                  <text v-for="t in item.tags.slice(0, 2)" :key="t" class="px-2 py-0.5 bg-[#F5F0EB] rounded-full text-[11px] text-[#E8A87C]">#{{ t }}</text>
                </view>
                <view class="flex items-center justify-between mt-2">
                  <view class="flex items-center gap-1.5">
                    <image :src="item.user?.avatar || '/static/logo.png'" class="w-[28px] h-[28px] rounded-full shrink-0" mode="aspectFill" />
                    <text class="text-[11px] text-gray-500">{{ item.user?.name }}</text>
                  </view>
                  <view class="flex items-center gap-1">
                    <text class="text-[12px]">🤍</text>
                    <text class="text-[11px] text-gray-400">{{ item.likes || 0 }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="flex-1 flex flex-col gap-2">
          <view v-for="(item, index) in rightList" :key="item.id" @click="goDetail(item.id)">
            <view class="bg-white rounded-2xl overflow-hidden shadow-sm">
              <image
                :src="getDisplayImageUrl(item.image) || 'https://via.placeholder.com/300x400'"
                mode="widthFix"
                class="w-full block"
                style="min-height: 120px;"
              />
              <view class="p-3">
                <text class="text-[14px] font-medium text-gray-800 line-clamp-2">{{ item.title }}</text>
                <view v-if="item.tags && item.tags.length" class="flex flex-wrap gap-1 mt-2">
                  <text v-for="t in item.tags.slice(0, 2)" :key="t" class="px-2 py-0.5 bg-[#F5F0EB] rounded-full text-[11px] text-[#E8A87C]">#{{ t }}</text>
                </view>
                <view class="flex items-center justify-between mt-2">
                  <view class="flex items-center gap-1.5">
                    <image :src="item.user?.avatar || '/static/logo.png'" class="w-[28px] h-[28px] rounded-full shrink-0" mode="aspectFill" />
                    <text class="text-[11px] text-gray-500">{{ item.user?.name }}</text>
                  </view>
                  <view class="flex items-center gap-1">
                    <text class="text-[12px]">🤍</text>
                    <text class="text-[11px] text-gray-400">{{ item.likes || 0 }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view v-if="searched && list.length > 0" class="py-4">
        <u-loadmore :status="loadStatus" lineColor="#F5F0EB" color="#C4A882" fontSize="12" :icon="true" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getPosts } from '@/api/post';
import { getDisplayImageUrl } from '@/utils/imageProxy';

const keyword = ref('');
const searchTag = ref(''); // when opened via ?tag=xxx
const searched = ref(false);
const loading = ref(false);
const loadStatus = ref<'loadmore' | 'loading' | 'nomore'>('loadmore');
const list = ref<any[]>([]);
const page = ref(1);
const limit = 10;

/** 搜索历史（本地缓存） */
const HISTORY_KEY = 'search_history';
const searchHistory = ref<string[]>([]);
try {
  const cached = uni.getStorageSync(HISTORY_KEY);
  if (cached) searchHistory.value = JSON.parse(cached);
} catch (_) {}

const saveHistory = (kw: string) => {
  if (!kw) return;
  searchHistory.value = [kw, ...searchHistory.value.filter(h => h !== kw)].slice(0, 10);
  uni.setStorageSync(HISTORY_KEY, JSON.stringify(searchHistory.value));
};
const clearHistory = () => {
  searchHistory.value = [];
  uni.removeStorageSync(HISTORY_KEY);
};
const onHistoryClick = (h: string) => {
  keyword.value = h;
  runSearch();
};

/** 热门搜索（静态数据） */
const hotSearches = ref([
  '三亚旅游攻略', '成都美食', '北京故宫', '上海迪士尼',
  '杭州西湖', '重庆火锅', '厦门鼓浪屿', '西安兵马俑',
  '云南大理', '青岛啤酒节'
]);
const onHotClick = (item: string) => {
  keyword.value = item;
  runSearch();
};

/** 推荐目的地 */
const recommendCities = reactive([
  { name: '京都', country: '日本', emoji: '⛩️', bg: '#FFF0E6' },
  { name: '巴厘岛', country: '印度尼西亚', emoji: '🏝️', bg: '#F0F8F2' },
  { name: '瑞士', country: '欧洲', emoji: '🏔️', bg: '#EDF4FA' },
  { name: '冰岛', country: '北欧', emoji: '🧊', bg: '#F5F0EB' },
  { name: '成都', country: '中国', emoji: '🐼', bg: '#FFF8E6' },
  { name: '三亚', country: '中国', emoji: '🏖️', bg: '#FFF0E6' },
]);
const onCityClick = (name: string) => {
  keyword.value = name;
  runSearch();
};

/** 防抖延迟：用户停止输入后再请求，避免边打字边疯狂请求 */
const SEARCH_DEBOUNCE_MS = 350;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

onLoad((options: any) => {
  if (options.tag) {
    searchTag.value = decodeURIComponent(options.tag);
    keyword.value = searchTag.value;
    searched.value = true;
    list.value = [];
    page.value = 1;
    loadMore();
  }
});

const leftList = computed(() => {
  return list.value.filter((_, i) => i % 2 === 0);
});
const rightList = computed(() => {
  return list.value.filter((_, i) => i % 2 === 1);
});

const goBack = () => {
  uni.navigateBack();
};

/** 执行一次搜索（重置列表并请求第一页） */
const runSearch = () => {
  const q = keyword.value.trim();
  if (!q) return;
  saveHistory(q);
  searchTag.value = '';
  searched.value = true;
  list.value = [];
  page.value = 1;
  loadStatus.value = 'loadmore';
  loadMore();
};

/** 输入时防抖搜索：边打字边出结果，停止输入 350ms 后自动搜 */
const onKeywordInput = () => {
  const q = keyword.value.trim();
  if (!q) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    searched.value = false;
    list.value = [];
    page.value = 1;
    loadStatus.value = 'loadmore';
    return;
  }
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runSearch();
  }, SEARCH_DEBOUNCE_MS);
};

/** 键盘「搜索」键：取消防抖并立即搜索 */
const onSearchConfirm = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  runSearch();
};

const clearKeyword = () => {
  keyword.value = '';
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  searched.value = false;
  list.value = [];
  page.value = 1;
  loadStatus.value = 'loadmore';
};

const loadMore = async () => {
  const q = keyword.value.trim();
  const tag = searchTag.value || q;
  if (!searched.value || (!q && !tag) || loadStatus.value === 'loading' || loadStatus.value === 'nomore') return;
  loadStatus.value = 'loading';
  try {
    const params: any = { page: page.value, limit };
    if (searchTag.value) params.tag = searchTag.value;
    else if (q) params.keyword = q;
    const res: any = await getPosts(params);
    if (res?.list?.length) {
      const newList = res.list.map((p: any) => ({
        id: p.id,
        image: p.image,
        title: p.title,
        tags: p.tags || [],
        user: p.user,
        likes: p.likes
      }));
      list.value = [...list.value, ...newList];
      if (page.value >= (res.totalPages || 1)) loadStatus.value = 'nomore';
      else { loadStatus.value = 'loadmore'; page.value++; }
    } else {
      loadStatus.value = 'nomore';
    }
  } catch (e) {
    loadStatus.value = 'loadmore';
  }
};

const goDetail = (id: number | string) => {
  uni.navigateTo({ url: `/pages/post/detail?id=${id}` });
};
</script>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.hot-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}

.hot-rank-top {
  background: linear-gradient(135deg, #E8A87C, #F5C7A9);
  color: white;
}

.search-page :deep(.uni-scroll-view) {
  flex: 1;
}
</style>
