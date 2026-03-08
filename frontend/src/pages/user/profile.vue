<template>
  <view class="container min-h-screen bg-[#F6F7F9] pb-20 relative">
    <!-- Immersive Header Background -->
    <view class="absolute top-0 left-0 right-0 h-64 z-0 overflow-hidden">
      <!-- Background Image -->
      <image
        src="https://picsum.photos/800/600?blur=4"
        mode="aspectFill"
        class="w-full h-full transform scale-105"
      />
      <!-- Gradient Overlay -->
      <view
        class="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#F6F7F9]"
      ></view>
    </view>

    <!-- Header / User Info（无顶栏，预留安全区） -->
    <view class="relative z-10 px-4 pt-safe pb-4">
      <!-- User Card -->
      <view class="bg-white rounded-[24px] p-5 shadow-float mb-4">
        <view class="flex items-center justify-between mb-4">
          <view class="flex items-center gap-3">
            <view class="w-[40px] h-[40px] flex-shrink-0">
              <image
                :src="headerAvatarSrc"
                mode="aspectFill"
                class="w-[40px] h-[40px] rounded-full border-[3px] border-white shadow-lg bg-white"
                @error="onHeaderAvatarError"
              />
            </view>

            <view>
              <text class="text-xl font-extrabold text-gray-900 block mb-0.5">{{
                userStore.userInfo?.username || "未登录"
              }}</text>
              <text class="text-xs text-gray-400 font-mono"
                >ID: {{ userStore.userInfo?.id || "888888" }}</text
              >
            </view>
          </view>

          <view class="flex gap-3">
            <view
              class="w-[40px] h-[40px] rounded-full bg-gray-50 flex items-center justify-center active:scale-90 transition-transform shadow-sm border border-gray-100"
            >
              <u-icon name="share-square" size="18" color="#333"></u-icon>
            </view>
            <view
              class="w-[40px] h-[40px] rounded-full bg-gray-50 flex items-center justify-center active:scale-90 transition-transform shadow-sm border border-gray-100"
            >
              <u-icon name="setting" size="18" color="#333"></u-icon>
            </view>
          </view>
        </view>

        <!-- Bio -->
        <text class="text-[13px] text-gray-600 leading-relaxed mb-5 block px-1">
          {{
            userStore.userInfo?.bio ||
            "✨ 热爱生活，分享美好。\n📷 摄影 | ✈️ 旅行 | 🥘 美食"
          }}
        </text>

        <!-- Stats：对接后端 stats -->
        <view
          class="flex items-center justify-around py-2 border-t border-gray-50"
        >
          <view
            class="flex flex-col items-center group active:opacity-70 transition-opacity"
          >
            <text class="text-lg font-bold text-gray-900 font-din">{{ userStore.userInfo?.stats?.followingCount ?? 0 }}</text>
            <text class="text-xs text-gray-400 mt-0.5 font-medium">关注</text>
          </view>
          <view class="w-[1px] h-4 bg-gray-100"> </view>
          <view
            class="flex flex-col items-center group active:opacity-70 transition-opacity"
          >
            <text class="text-lg font-bold text-gray-900 font-din">{{ userStore.userInfo?.stats?.followerCount ?? 0 }}</text>
            <text class="text-xs text-gray-400 mt-0.5 font-medium">粉丝</text>
          </view>
          <view class="w-[1px] h-4 bg-gray-100"> </view>
          <view
            class="flex flex-col items-center group active:opacity-70 transition-opacity"
          >
            <text class="text-lg font-bold text-gray-900 font-din">{{ userStore.userInfo?.stats?.receivedLikesCount ?? 0 }}</text>
            <text class="text-xs text-gray-400 mt-0.5 font-medium">获赞与收藏</text>
          </view>
        </view>

        <!-- 我的行程入口（小红书风格） -->
        <view
          class="mt-4 rounded-2xl bg-gradient-to-r from-[#FFF5F5] to-[#FFE8E8] border border-[#FFE0E0] p-4 flex items-center justify-between active:scale-[0.99] transition-transform"
          @click="goToItinerary"
        >
          <view class="flex items-center gap-3">
            <view class="w-10 h-10 rounded-xl bg-[#FF2442]/10 flex items-center justify-center">
              <u-icon name="map" size="22" color="#FF2442"></u-icon>
            </view>
            <view>
              <text class="text-[15px] font-bold text-gray-900 block">我的行程</text>
              <text class="text-[12px] text-gray-500">AI 生成的旅行计划</text>
            </view>
          </view>
          <u-icon name="arrow-right" size="18" color="#999"></u-icon>
        </view>

        <!-- Action Buttons -->
        <view class="flex gap-3 mt-6">
          <view
            class="flex-1 bg-[#FF2442] flex items-center justify-center shadow-lg shadow-[#FF2442]/20 active:scale-[0.98] transition-all"
            style="height: 56px; border-radius: 20px"
            @click="goToEditProfile"
          >
            <text class="text-white text-[18px] font-bold tracking-wide"
              >编辑资料</text
            >
          </view>
          <view
            class="flex-1 bg-gray-50 border border-gray-200 flex items-center justify-center active:bg-gray-100 transition-colors"
            style="height: 56px; border-radius: 20px"
            @click="goToPublicHome"
          >
            <text class="text-gray-800 text-[18px] font-bold tracking-wide"
              >查看主页</text
            >
          </view>
        </view>
      </view>
    </view>

    <!-- Content Tabs -->
    <view
      class="sticky top-0 z-20 bg-[#F6F7F9]/95 backdrop-blur-xl border-b border-gray-200/50"
    >
      <view class="flex justify-around px-4">
        <view
          v-for="(tab, index) in tabs"
          :key="index"
          class="relative py-3 px-2 flex flex-col items-center transition-all h-12 justify-center"
          @click="switchTab(index)"
        >
          <text
            class="text-[14px] transition-all duration-300"
            :class="
              currentTab === index
                ? 'text-gray-900 font-bold scale-110'
                : 'text-gray-400 font-medium'
            "
          >
            {{ tab.name }}
          </text>
          <view
            class="absolute bottom-1 w-4 h-1 bg-[#FF2442] rounded-full transition-all duration-300 transform origin-center"
            :class="
              currentTab === index
                ? 'scale-x-100 opacity-100'
                : 'scale-x-0 opacity-0'
            "
          ></view>
        </view>
      </view>
    </view>

    <!-- Grid Content (Waterfall Mock) -->
    <view class="p-2 min-h-[300px]">
      <view v-if="postList.length > 0" class="flex flex-wrap">
        <view
          v-for="(item, index) in postList"
          :key="item.id"
          class="w-1/2 p-1.5 box-border"
          @click="goToDetail(item.id)"
        >
          <view
            class="bg-white rounded-xl overflow-hidden shadow-sm active:scale-[0.98] transition-transform duration-200 h-full flex flex-col"
          >
            <image
              :src="
                item.image || `https://picsum.photos/300/400?random=${index}`
              "
              mode="aspectFill"
              class="w-full h-48 bg-gray-100 block"
            />
            <view class="p-2.5 flex-1 flex flex-col justify-between">
              <text
                class="text-[13px] text-gray-800 line-clamp-2 font-medium mb-2 leading-snug"
                >{{ item.title }}</text
              >
              <view class="flex items-center justify-between">
                <view class="flex items-center gap-1.5">
                  <image
                    :src="item.user?.avatar || '/static/logo.png'"
                    class="w-[32px] h-[32px] rounded-full flex-shrink-0 bg-gray-100"
                    mode="aspectFill"
                  />
                  <text
                    class="text-[10px] text-gray-500 line-clamp-1 max-w-[60px]"
                    >{{ item.user?.name || "用户" }}</text
                  >
                </view>
                <view class="flex items-center gap-1">
                  <u-icon
                    :name="item.isLiked ? 'heart-fill' : 'heart'"
                    size="14"
                    :color="item.isLiked ? '#FF2442' : '#cbd5e1'"
                  ></u-icon>
                  <text
                    class="text-xs"
                    :class="item.isLiked ? 'text-[#FF2442]' : 'text-gray-400'"
                    >{{ item.likes || 0 }}</text
                  >
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Empty State -->
      <view
        v-else
        class="flex flex-col items-center justify-center py-20 animate-fade-in"
      >
        <view
          class="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mb-4"
        >
          <u-icon name="empty-data" size="48" color="#d1d5db"></u-icon>
        </view>
        <text class="text-gray-400 text-sm font-medium">这里空空如也</text>
        <view
          class="mt-6 px-8 py-2.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 font-bold shadow-sm active:scale-95 transition-transform"
        >
          去发现更多精彩
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useUserStore } from "@/stores/user";
// @ts-ignore
import UIcon from "uview-plus/components/u-icon/u-icon.vue";
import { request } from "@/utils/request";

const userStore = useUserStore();
const currentTab = ref(0);
const postList = ref<any[]>([]);

// 顶部头像：优先用 store，加载失败时用兜底，避免空白
const headerAvatarFallback = ref<string | null>(null);
const headerAvatarSrc = computed(() =>
  headerAvatarFallback.value !== null
    ? headerAvatarFallback.value
    : (userStore.userInfo?.avatar || "/static/logo.png")
);
const onHeaderAvatarError = () => {
  headerAvatarFallback.value = "/static/logo.png";
};

const tabs = [
  { name: "笔记", type: "posts" },
  { name: "收藏", type: "favorites" },
  { name: "赞过", type: "likes" },
];

const loadData = async () => {
  try {
    const type = tabs[currentTab.value].type;
    const res: any = await request({
      url: "/user/activities",
      method: "GET",
      params: { type },
    });
    postList.value = res || [];
  } catch (error) {
    console.error("Failed to load profile data:", error);
    postList.value = [];
  }
};

const switchTab = (index: number) => {
  currentTab.value = index;
  loadData();
};

const goToDetail = (id: string | number) => {
  uni.navigateTo({
    url: `/pages/post/detail?id=${id}`,
  });
};

const goToEditProfile = () => {
  uni.navigateTo({
    url: '/pages/user/edit'
  });
};

const goToPublicHome = () => {
  const id = userStore.userInfo?.id;
  if (id != null) {
    uni.navigateTo({ url: `/pages/user/home?id=${id}` });
  } else {
    uni.showToast({ title: '请先登录', icon: 'none' });
  }
};

const goToItinerary = () => {
  uni.navigateTo({ url: '/pages/itinerary/list' });
};

onMounted(() => {
  if (userStore.token) {
    userStore.getUserInfo().then(() => loadData());
  } else if (userStore.userInfo) {
    loadData();
  }
});

// 用户信息更新时重置头像兜底，以便显示新头像（如 base64）
watch(
  () => userStore.userInfo?.avatar,
  () => {
    headerAvatarFallback.value = null;
  },
);

// Watch for login status change
watch(
  () => userStore.userInfo,
  (newVal) => {
    if (newVal) {
      loadData();
    }
  },
);
</script>

<style lang="scss" scoped>
.pt-safe {
  padding-top: calc(24px + constant(safe-area-inset-top));
  padding-top: calc(24px + env(safe-area-inset-top));
}
</style>
