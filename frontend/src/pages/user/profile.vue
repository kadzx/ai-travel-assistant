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

    <!-- Header / User Info -->
    <view class="relative z-10 px-4 pt-24 pb-4">
      <!-- User Card -->
      <view class="bg-white rounded-[24px] p-5 shadow-float mb-4">
        <view class="flex items-start justify-between mb-4">
          <view class="flex items-center gap-4">
            <view class="relative -mt-10">
              <image
                :src="userStore.userInfo?.avatar || '/static/logo.png'"
                mode="aspectFill"
                class="w-20 h-20 rounded-full border-[3px] border-white shadow-lg bg-white"
              />
              <view
                class="absolute bottom-0 right-0 bg-gradient-to-r from-[#FF2442] to-[#FF5E7D] text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white shadow-sm flex items-center gap-0.5"
              >
                <u-icon name="level" color="#fff" size="10"></u-icon>
                <text>Lv.3</text>
              </view>
            </view>

            <view class="pt-1">
              <text class="text-xl font-extrabold text-gray-900 block mb-0.5">{{
                userStore.userInfo?.username || "未登录"
              }}</text>
              <text class="text-xs text-gray-400 font-mono"
                >ID: {{ userStore.userInfo?.id || "888888" }}</text
              >
            </view>
          </view>

          <view class="flex gap-3 pt-1">
            <view
              class="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center active:scale-90 transition-transform shadow-sm border border-gray-100"
            >
              <u-icon name="share-square" size="18" color="#333"></u-icon>
            </view>
            <view
              class="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center active:scale-90 transition-transform shadow-sm border border-gray-100"
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

        <!-- Stats -->
        <view
          class="flex items-center justify-around py-2 border-t border-gray-50"
        >
          <view
            class="flex flex-col items-center group active:opacity-70 transition-opacity"
          >
            <text class="text-lg font-bold text-gray-900 font-din">142</text>
            <text class="text-xs text-gray-400 mt-0.5 font-medium">关注</text>
          </view>
          <view class="w-[1px] h-4 bg-gray-100"> </view>
          <view
            class="flex flex-col items-center group active:opacity-70 transition-opacity"
          >
            <text class="text-lg font-bold text-gray-900 font-din">3.5k</text>
            <text class="text-xs text-gray-400 mt-0.5 font-medium">粉丝</text>
          </view>
          <view class="w-[1px] h-4 bg-gray-100"> </view>
          <view
            class="flex flex-col items-center group active:opacity-70 transition-opacity"
          >
            <text class="text-lg font-bold text-gray-900 font-din">{{
              userStore.userInfo?.stats?.receivedLikesCount || 0
            }}</text>
            <text class="text-xs text-gray-400 mt-0.5 font-medium"
              >获赞与收藏</text
            >
          </view>
        </view>

        <!-- Action Buttons -->
        <view class="flex gap-3 mt-6">
          <view
            class="flex-1 bg-[#FF2442] flex items-center justify-center shadow-lg shadow-[#FF2442]/20 active:scale-[0.98] transition-all"
            style="height: 56px; border-radius: 20px"
          >
            <text class="text-white text-[18px] font-bold tracking-wide"
              >编辑资料</text
            >
          </view>
          <view
            class="flex-1 bg-gray-50 border border-gray-200 flex items-center justify-center active:bg-gray-100 transition-colors"
            style="height: 56px; border-radius: 20px"
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
                    class="w-4 h-4 rounded-full"
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
import { ref, onMounted, watch } from "vue";
import { useUserStore } from "@/stores/user";
// @ts-ignore
import UIcon from "uview-plus/components/u-icon/u-icon.vue";
import { request } from "@/utils/request";

const userStore = useUserStore();
const currentTab = ref(0);
const postList = ref<any[]>([]);

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
      data: { type },
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

onMounted(() => {
  if (userStore.userInfo) {
    loadData();
    // Refresh user info to update stats
    userStore.getUserInfo();
  }
});

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
/* Scoped styles */
</style>
