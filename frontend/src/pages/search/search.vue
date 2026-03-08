<template>
  <view class="min-h-screen bg-[#F6F7F9] flex flex-col">
    <view class="sticky top-0 z-50 bg-[#F6F7F9]/95 backdrop-blur-xl border-b border-gray-200/50">
      <view class="h-[var(--status-bar-height)]"></view>
      <view class="px-4 py-3 flex items-center gap-3">
        <view class="flex-1 flex items-center bg-white rounded-full pl-4 pr-3 py-2 border border-gray-100">
          <u-icon name="search" size="18" color="#999"></u-icon>
          <input
            v-model="keyword"
            class="flex-1 ml-2 text-[15px] text-gray-900"
            placeholder="搜索帖子、标签"
            placeholder-class="text-gray-400"
            confirm-type="search"
            @input="onKeywordInput"
            @confirm="onSearchConfirm"
          />
          <text v-if="keyword" class="text-[#FF2442] text-sm font-medium" @click="clearKeyword">取消</text>
        </view>
        <text class="text-gray-700 text-[15px]" @click="goBack">返回</text>
      </view>
    </view>

    <scroll-view scroll-y class="flex-1" @scrolltolower="loadMore" :lower-threshold="100">
      <view v-if="!searched" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <u-icon name="search" size="48" color="#d1d5db"></u-icon>
        <text class="mt-3 text-sm">输入关键词或标签搜索帖子</text>
      </view>
      <view v-else-if="loading && list.length === 0" class="flex justify-center py-20">
        <u-loading-icon mode="circle"></u-loading-icon>
      </view>
      <view v-else-if="list.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <u-icon name="file-text" size="48" color="#d1d5db"></u-icon>
        <text class="mt-3 text-sm">暂无结果</text>
      </view>
      <view v-else class="px-2 py-3 flex gap-2 items-start">
        <view class="flex-1 flex flex-col gap-2">
          <view v-for="(item, index) in leftList" :key="item.id" @click="goDetail(item.id)">
            <view class="bg-white rounded-xl overflow-hidden shadow-sm">
              <image
                :src="item.image || 'https://via.placeholder.com/300x400'"
                mode="widthFix"
                class="w-full block"
                style="min-height: 120px;"
              />
              <view class="p-3">
                <text class="text-[14px] font-medium text-gray-800 line-clamp-2">{{ item.title }}</text>
                <view v-if="item.tags && item.tags.length" class="flex flex-wrap gap-1 mt-2">
                  <text v-for="t in item.tags.slice(0, 2)" :key="t" class="px-2 py-0.5 bg-gray-100 rounded text-[11px] text-gray-500">#{{ t }}</text>
                </view>
                <view class="flex items-center justify-between mt-2">
                  <view class="flex items-center gap-1.5">
                    <image :src="item.user?.avatar || '/static/logo.png'" class="w-[28px] h-[28px] rounded-full shrink-0" mode="aspectFill" />
                    <text class="text-[11px] text-gray-500">{{ item.user?.name }}</text>
                  </view>
                  <view class="flex items-center gap-1">
                    <u-icon name="heart" size="14" color="#94a3b8"></u-icon>
                    <text class="text-[11px] text-gray-400">{{ item.likes || 0 }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
        <view class="flex-1 flex flex-col gap-2">
          <view v-for="(item, index) in rightList" :key="item.id" @click="goDetail(item.id)">
            <view class="bg-white rounded-xl overflow-hidden shadow-sm">
              <image
                :src="item.image || 'https://via.placeholder.com/300x400'"
                mode="widthFix"
                class="w-full block"
                style="min-height: 120px;"
              />
              <view class="p-3">
                <text class="text-[14px] font-medium text-gray-800 line-clamp-2">{{ item.title }}</text>
                <view v-if="item.tags && item.tags.length" class="flex flex-wrap gap-1 mt-2">
                  <text v-for="t in item.tags.slice(0, 2)" :key="t" class="px-2 py-0.5 bg-gray-100 rounded text-[11px] text-gray-500">#{{ t }}</text>
                </view>
                <view class="flex items-center justify-between mt-2">
                  <view class="flex items-center gap-1.5">
                    <image :src="item.user?.avatar || '/static/logo.png'" class="w-[28px] h-[28px] rounded-full shrink-0" mode="aspectFill" />
                    <text class="text-[11px] text-gray-500">{{ item.user?.name }}</text>
                  </view>
                  <view class="flex items-center gap-1">
                    <u-icon name="heart" size="14" color="#94a3b8"></u-icon>
                    <text class="text-[11px] text-gray-400">{{ item.likes || 0 }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="py-4">
        <u-loadmore :status="loadStatus" lineColor="#E5E7EB" color="#9CA3AF" fontSize="12" :icon="true" />
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getPosts } from '@/api/post';

const keyword = ref('');
const searchTag = ref(''); // when opened via ?tag=xxx
const searched = ref(false);
const loading = ref(false);
const loadStatus = ref<'loadmore' | 'loading' | 'nomore'>('loadmore');
const list = ref<any[]>([]);
const page = ref(1);
const limit = 10;

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
</style>
