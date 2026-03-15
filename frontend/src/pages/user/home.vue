<template>
  <view class="container min-h-screen bg-white">
    <!-- Navbar：预留安全区，避免顶栏被刘海/状态栏遮挡 -->
    <view class="sticky top-0 z-50 bg-white border-b border-gray-100 nav-bar">
      <view class="flex items-center justify-between px-4 nav-row">
        <view
          class="flex items-center w-10 h-10 justify-center -ml-2 active:opacity-60"
          @click="goBack"
        >
          <u-icon name="arrow-left" size="24" color="#333"></u-icon>
        </view>
        <view class="flex-1"></view>
        <view class="flex items-center gap-3">
          <view class="p-1 active:opacity-70" @click="handleShare">
            <u-icon name="share" size="22" color="#333"></u-icon>
          </view>
          <view class="p-1 active:opacity-70" @click="showMore">
            <u-icon name="more-dot-fill" size="22" color="#333"></u-icon>
          </view>
        </view>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading" class="flex items-center justify-center pt-20">
      <u-loading-icon mode="circle"></u-loading-icon>
    </view>

    <!-- User Info（留出顶栏距离，避免被 bar 挡住） -->
    <view v-else-if="userInfo" class="relative user-info-wrap">
      <!-- Cover/Background (Optional) -->
      <view class="h-32 bg-gray-100 relative overflow-hidden">
        <!-- Mock cover image -->
        <image
          src="https://picsum.photos/800/400"
          mode="aspectFill"
          class="w-full h-full opacity-80"
        />
        <view
          class="absolute inset-0 bg-gradient-to-b from-transparent to-white/90"
        ></view>
      </view>

      <view class="px-6 -mt-6 relative z-10">
        <!-- 头像在左、名字与 ID 在右，同一行；右侧操作按钮 -->
        <view class="flex items-center gap-4 mb-4">
          <image
            :src="userInfo.avatar || '/static/logo.png'"
            mode="aspectFill"
            class="w-[40px] h-[40px] rounded-full border-[3px] border-white shadow-sm bg-gray-50 flex-shrink-0"
          />
          <view class="flex-1 min-w-0">
            <text class="text-xl font-bold text-gray-900 block truncate">{{
              userInfo.nickname || userInfo.username
            }}</text>
            <text class="text-xs text-gray-400 block"
              >ID: {{ userInfo.id }}</text
            >
          </view>
          <view class="flex items-center gap-2 flex-shrink-0">
            <view
              class="w-[40px] h-[40px] border border-gray-200 rounded-full flex items-center justify-center bg-white active:bg-gray-50"
              @click="handleChat"
            >
              <u-icon name="chat" size="18" color="#333"></u-icon>
            </view>
            <view v-if="!isSelf">
              <view
                class="px-5 py-2 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                :class="isFollowing ? 'bg-gray-100' : 'bg-[#FF2442]'"
                @click="handleFollow"
              >
                <text
                  class="text-sm font-bold"
                  :class="isFollowing ? 'text-gray-600' : 'text-white'"
                  >{{ isFollowing ? "已关注" : "关注" }}</text
                >
              </view>
            </view>
          </view>
        </view>

        <view class="mb-6">
          <text
            class="text-sm text-gray-700 leading-relaxed"
            v-if="userInfo.bio"
            >{{ userInfo.bio }}</text
          >
          <text class="text-sm text-gray-400 italic" v-else
            >这个人很懒，什么都没写~</text
          >
        </view>

        <!-- Stats -->
        <view class="flex gap-6 mb-6">
          <view class="flex items-center gap-1">
            <text class="text-lg font-bold text-gray-900">{{
              stats.followingCount
            }}</text>
            <text class="text-xs text-gray-500">关注</text>
          </view>
          <view class="flex items-center gap-1">
            <text class="text-lg font-bold text-gray-900">{{
              stats.followerCount
            }}</text>
            <text class="text-xs text-gray-500">粉丝</text>
          </view>
          <view class="flex items-center gap-1">
            <text class="text-lg font-bold text-gray-900">{{
              stats.receivedLikesCount
            }}</text>
            <text class="text-xs text-gray-500">获赞</text>
          </view>
        </view>
      </view>

      <!-- Tabs -->
      <view class="tabs-bar sticky bg-white z-40 border-b border-gray-100">
        <view class="flex items-center px-4">
          <view
            v-for="(tab, index) in tabs"
            :key="index"
            class="flex-1 flex flex-col items-center justify-center py-3 relative"
            @click="currentTab = index"
          >
            <text
              class="text-[15px] transition-all"
              :class="
                currentTab === index
                  ? 'text-gray-900 font-bold'
                  : 'text-gray-500'
              "
            >
              {{ tab }}
            </text>
            <view
              v-if="currentTab === index"
              class="absolute bottom-0 w-8 h-[2px] bg-[#FF2442] rounded-full"
            ></view>
          </view>
        </view>
      </view>

      <!-- Content List -->
      <view class="min-h-[300px] bg-gray-50 p-2">
        <view v-if="currentTab === 0">
          <!-- Notes List (Masonry) - 有数据时只显示网格 -->
          <view v-if="posts.length > 0" class="flex gap-2 items-start">
            <view class="flex-1 flex flex-col gap-2">
              <view
                v-for="item in leftList"
                :key="item.id"
                class="bg-white rounded-lg overflow-hidden shadow-sm break-inside-avoid"
                @click="goToDetail(item.id)"
              >
                <image
                  :src="
                    getDisplayImageUrl(item.image) ||
                    'https://via.placeholder.com/300x400?text=暂无图'
                  "
                  mode="widthFix"
                  class="w-full bg-gray-100 min-h-[120px]"
                />
                <view class="p-2">
                  <text
                    class="text-sm font-medium text-gray-900 line-clamp-2 mb-2 block"
                    >{{ item.title }}</text
                  >
                  <view class="flex items-center justify-between">
                    <view class="flex items-center gap-1">
                      <u-icon name="heart" size="14" color="#999"></u-icon>
                      <text class="text-xs text-gray-400">{{
                        item.likes || 0
                      }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
            <view class="flex-1 flex flex-col gap-2">
              <view
                v-for="item in rightList"
                :key="item.id"
                class="bg-white rounded-lg overflow-hidden shadow-sm break-inside-avoid"
                @click="goToDetail(item.id)"
              >
                <image
                  :src="
                    getDisplayImageUrl(item.image) ||
                    'https://via.placeholder.com/300x400?text=暂无图'
                  "
                  mode="widthFix"
                  class="w-full bg-gray-100 min-h-[120px]"
                />
                <view class="p-2">
                  <text
                    class="text-sm font-medium text-gray-900 line-clamp-2 mb-2 block"
                    >{{ item.title }}</text
                  >
                  <view class="flex items-center justify-between">
                    <view class="flex items-center gap-1">
                      <u-icon name="heart" size="14" color="#999"></u-icon>
                      <text class="text-xs text-gray-400">{{
                        item.likes || 0
                      }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
          <!-- Empty State - 无笔记时只显示空状态 -->
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
.nav-bar {
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
  padding-top: 12px;
}
.tabs-bar {
  top: calc(44px + constant(safe-area-inset-top));
  top: calc(44px + env(safe-area-inset-top));
}
</style>
