<template>
  <view class="container min-h-screen" style="background-color: #FFF8F0">
    <!-- 毛玻璃顶栏 -->
    <view class="nav-bar">
      <view class="nav-row flex items-center justify-between px-4">
        <view
          class="flex items-center w-10 h-10 justify-center -ml-2 active:opacity-60"
          @click="goBack"
        >
          <u-icon name="arrow-left" size="22" color="#5B4636"></u-icon>
        </view>
        <text class="text-base font-semibold" style="color: #5B4636">{{
          userInfo?.nickname || userInfo?.username || ''
        }}</text>
        <view class="flex items-center gap-3">
          <view class="p-1 active:opacity-70" @click="handleShare">
            <u-icon name="share" size="20" color="#5B4636"></u-icon>
          </view>
          <view class="p-1 active:opacity-70" @click="showMore">
            <u-icon name="more-dot-fill" size="20" color="#5B4636"></u-icon>
          </view>
        </view>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="flex items-center justify-center pt-20">
      <u-loading-icon mode="circle"></u-loading-icon>
    </view>

    <!-- User Info -->
    <view v-else-if="userInfo" class="relative user-info-wrap">
      <!-- Hero 渐变区域 -->
      <view class="hero-section relative overflow-hidden">
        <!-- 装饰 blob -->
        <view class="blob blob-pink"></view>
        <view class="blob blob-green"></view>
        <view class="blob blob-orange"></view>

        <!-- 头像 + 昵称 + 简介 -->
        <view class="flex flex-col items-center pt-10 pb-6 relative z-10">
          <image
            :src="userInfo.avatar || '/static/logo.png'"
            mode="aspectFill"
            class="avatar-box"
          />
          <text class="text-xl font-bold mt-3" style="color: #3D2E1F">{{
            userInfo.nickname || userInfo.username
          }}</text>
          <text class="text-xs mt-1" style="color: #A89585"
            >ID: {{ userInfo.id }}</text
          >
          <text
            class="text-sm mt-2 px-8 text-center leading-relaxed"
            style="color: #7A6B5D"
            v-if="userInfo.bio"
            >{{ userInfo.bio }}</text
          >
          <text
            class="text-sm mt-2 italic"
            style="color: #C4B5A5"
            v-else
            >这个人很懒，什么都没写~</text
          >

          <!-- 操作按钮 -->
          <view class="flex items-center gap-3 mt-4">
            <view
              class="chat-btn active:opacity-80"
              @click="handleChat"
            >
              <u-icon name="chat" size="18" color="#E8A87C"></u-icon>
            </view>
            <view v-if="!isSelf">
              <view
                class="follow-btn active:scale-95 transition-transform"
                :class="isFollowing ? 'follow-btn--following' : 'follow-btn--default'"
                @click="handleFollow"
              >
                <text
                  class="text-sm font-bold"
                  :style="isFollowing ? 'color: #E8A87C' : 'color: #fff'"
                  >{{ isFollowing ? '已关注' : '关注' }}</text
                >
              </view>
            </view>
          </view>
        </view>

        <!-- 底部波浪 SVG -->
        <view class="wave-wrap">
          <!-- svelte-ignore -->
          <image src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 100'%3E%3Cpath fill='%23FFF8F0' d='M0,40 C360,100 1080,0 1440,60 L1440,100 L0,100 Z'/%3E%3C/svg%3E" mode="widthFix" class="w-full" />
        </view>
      </view>

      <!-- 统计卡片 -->
      <view class="stats-card mx-4 -mt-2 relative z-20">
        <view class="flex items-center">
          <view class="stat-item flex-1">
            <text class="stat-num">{{ posts.length }}</text>
            <text class="stat-label">帖子</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item flex-1">
            <text class="stat-num">{{ stats.receivedLikesCount }}</text>
            <text class="stat-label">获赞</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item flex-1">
            <text class="stat-num">{{ stats.followingCount }}</text>
            <text class="stat-label">关注</text>
          </view>
          <view class="stat-divider"></view>
          <view class="stat-item flex-1">
            <text class="stat-num">{{ stats.followerCount }}</text>
            <text class="stat-label">粉丝</text>
          </view>
        </view>
      </view>

      <!-- Tab -->
      <view class="tabs-bar">
        <view class="flex items-center px-4">
          <view
            v-for="(tab, index) in tabs"
            :key="index"
            class="flex-1 flex flex-col items-center justify-center py-3 relative"
            @click="currentTab = index"
          >
            <text
              class="text-[15px] transition-all"
              :style="currentTab === index ? 'color: #3D2E1F; font-weight: 700' : 'color: #B5A898'"
            >
              {{ index === 0 ? '📝 ' : '' }}{{ tab }}
            </text>
            <view
              v-if="currentTab === index"
              class="absolute bottom-0 w-8 h-[3px] rounded-full"
              style="background: linear-gradient(90deg, #E8A87C, #D4A574)"
            ></view>
          </view>
        </view>
      </view>

      <!-- Content List -->
      <view class="min-h-[300px] p-2" style="background-color: #FFF8F0">
        <view v-if="currentTab === 0">
          <!-- Notes Masonry -->
          <view v-if="posts.length > 0" class="flex gap-2 items-start">
            <view class="flex-1 flex flex-col gap-2">
              <view
                v-for="item in leftList"
                :key="item.id"
                class="post-card"
                @click="goToDetail(item.id)"
              >
                <image
                  :src="
                    getDisplayImageUrl(item.image) ||
                    'https://via.placeholder.com/300x400?text=暂无图'
                  "
                  mode="widthFix"
                  class="w-full min-h-[120px]"
                  style="background-color: #FFF0E6"
                />
                <view class="p-2.5">
                  <text
                    class="text-sm font-medium line-clamp-2 mb-2 block"
                    style="color: #3D2E1F"
                    >{{ item.title }}</text
                  >
                  <view class="flex items-center gap-1">
                    <u-icon name="heart" size="14" color="#E8A87C"></u-icon>
                    <text class="text-xs" style="color: #B5A898">{{
                      item.likes || 0
                    }}</text>
                  </view>
                </view>
              </view>
            </view>
            <view class="flex-1 flex flex-col gap-2">
              <view
                v-for="item in rightList"
                :key="item.id"
                class="post-card"
                @click="goToDetail(item.id)"
              >
                <image
                  :src="
                    getDisplayImageUrl(item.image) ||
                    'https://via.placeholder.com/300x400?text=暂无图'
                  "
                  mode="widthFix"
                  class="w-full min-h-[120px]"
                  style="background-color: #FFF0E6"
                />
                <view class="p-2.5">
                  <text
                    class="text-sm font-medium line-clamp-2 mb-2 block"
                    style="color: #3D2E1F"
                    >{{ item.title }}</text
                  >
                  <view class="flex items-center gap-1">
                    <u-icon name="heart" size="14" color="#E8A87C"></u-icon>
                    <text class="text-xs" style="color: #B5A898">{{
                      item.likes || 0
                    }}</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
          <!-- Empty -->
          <view v-else class="py-10 flex flex-col items-center">
            <u-empty mode="data" text="暂无笔记"></u-empty>
          </view>
        </view>

        <view v-else class="py-10 flex flex-col items-center">
          <u-empty mode="permission" text="暂无权限查看"></u-empty>
        </view>
      </view>
    </view>

    <view v-else class="flex flex-col items-center justify-center pt-20">
      <u-empty mode="data" text="用户不存在"></u-empty>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useUserStore } from "@/stores/user";
import { getPublicProfile } from "@/api/user";
import { followUser, unfollowUser } from "@/api/follow";
import { getPosts } from "@/api/post";
import { getDisplayImageUrl } from "@/utils/imageProxy";

const userStore = useUserStore();
const loading = ref(true);
const userInfo = ref<any>(null);
const posts = ref<any[]>([]);
const leftList = ref<any[]>([]);
const rightList = ref<any[]>([]);
const isFollowing = ref(false);
const userId = ref<string>("");

const stats = computed(() => {
  if (!userInfo.value?.stats)
    return { followingCount: 0, followerCount: 0, receivedLikesCount: 0 };
  return userInfo.value.stats;
});

const isSelf = computed(() => {
  const currentId = userStore.userInfo?.id;
  if (currentId == null || !userId.value) return false;
  return String(currentId) === String(userId.value);
});

const tabs = ["笔记", "收藏", "赞过"];
const currentTab = ref(0);

onLoad(async (options: any) => {
  if (options.id) {
    userId.value = String(options.id);
    await fetchUserProfile(userId.value);
    await fetchUserPosts(userId.value);
  } else {
    loading.value = false;
  }
});

const fetchUserProfile = async (id: string) => {
  try {
    const res = await getPublicProfile(id);
    userInfo.value = res;
    isFollowing.value = !!res.isFollowing;
  } catch (e) {
    console.error(e);
    userInfo.value = null;
  } finally {
    loading.value = false;
  }
};

const fetchUserPosts = async (id: string) => {
  try {
    const res: any = await getPosts({ userId: id, page: 1, limit: 20 });
    const list = res?.list || [];
    posts.value = list.map((p: any) => ({
      id: p.id,
      title: p.title,
      image: p.image || (p.images && p.images[0]),
      likes: p.likes,
    }));
    distributePosts(posts.value);
  } catch (e) {
    console.error(e);
  }
};

const distributePosts = (list: any[]) => {
  leftList.value = [];
  rightList.value = [];
  list.forEach((item, index) => {
    if (index % 2 === 0) leftList.value.push(item);
    else rightList.value.push(item);
  });
};

const goBack = () => uni.navigateBack();

const handleFollow = async () => {
  if (!userId.value || isSelf.value) return;
  try {
    if (isFollowing.value) {
      await unfollowUser(userId.value);
      isFollowing.value = false;
      if (userInfo.value?.stats)
        userInfo.value.stats.followerCount = Math.max(
          0,
          (userInfo.value.stats.followerCount || 0) - 1,
        );
      uni.showToast({ title: "已取消关注", icon: "none" });
    } else {
      await followUser(userId.value);
      isFollowing.value = true;
      if (userInfo.value?.stats)
        userInfo.value.stats.followerCount =
          (userInfo.value.stats.followerCount || 0) + 1;
      uni.showToast({ title: "关注成功", icon: "success" });
    }
  } catch (e) {
    uni.showToast({ title: "操作失败", icon: "none" });
  }
};

const handleShare = () => {
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/#/pages/user/home?id=${userId.value}`;
  uni.setClipboardData({ data: url });
  uni.showToast({ title: "链接已复制", icon: "none" });
};

const showMore = () => {
  uni.showActionSheet({
    itemList: ["复制链接", "举报"],
    success: (res) => {
      if (res.tapIndex === 0) handleShare();
      else uni.showToast({ title: "举报功能敬请期待", icon: "none" });
    },
  });
};

const handleChat = () => {
  uni.showToast({ title: "私信功能敬请期待", icon: "none" });
};

const goToDetail = (id: string | number) => {
  uni.navigateTo({ url: `/pages/post/detail?id=${id}` });
};
</script>

<style scoped>
/* 毛玻璃顶栏 */
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 248, 240, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(232, 168, 124, 0.12);
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
  padding-bottom: 2px;
}
.nav-row {
  min-height: 44px;
  height: 44px;
  align-items: center;
}

.user-info-wrap {
  padding-top: 0;
}

/* Hero 渐变 */
.hero-section {
  background: linear-gradient(180deg, #FFF0E6 0%, #FFF8F0 100%);
  position: relative;
}

/* 装饰 blob */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.35;
}
.blob-pink {
  width: 140px;
  height: 140px;
  background: #F8D5D0;
  top: -20px;
  right: -30px;
}
.blob-green {
  width: 100px;
  height: 100px;
  background: #D5ECD4;
  bottom: 40px;
  left: -20px;
}
.blob-orange {
  width: 80px;
  height: 80px;
  background: #F5D6B8;
  top: 30px;
  left: 40px;
}

/* 头像 */
.avatar-box {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  border: 3px solid #fff;
  box-shadow: 0 4px 16px rgba(232, 168, 124, 0.18);
  background-color: #FFF0E6;
}

/* 聊天按钮 */
.chat-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid #E8A87C;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 关注按钮 */
.follow-btn {
  padding: 8px 24px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(232, 168, 124, 0.2);
}
.follow-btn--default {
  background: linear-gradient(135deg, #E8A87C, #D4A574);
}
.follow-btn--following {
  background: #fff;
  border: 1.5px solid #E8A87C;
}

/* 波浪 */
.wave-wrap {
  position: relative;
  margin-top: -2px;
  line-height: 0;
}

/* 统计卡片 */
.stats-card {
  background: #fff;
  border-radius: 20px;
  padding: 16px 8px;
  box-shadow: 0 2px 16px rgba(232, 168, 124, 0.1);
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.stat-num {
  font-size: 18px;
  font-weight: 700;
  color: #3D2E1F;
}
.stat-label {
  font-size: 11px;
  color: #B5A898;
}
.stat-divider {
  width: 1px;
  height: 28px;
  background: rgba(232, 168, 124, 0.18);
}

/* Tabs */
.tabs-bar {
  position: sticky;
  z-index: 40;
  background: #FFF8F0;
  border-bottom: 1px solid rgba(232, 168, 124, 0.1);
  top: calc(44px + constant(safe-area-inset-top));
  top: calc(44px + env(safe-area-inset-top));
  margin-top: 12px;
}

/* 帖子卡片 */
.post-card {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(232, 168, 124, 0.08);
}
</style>
