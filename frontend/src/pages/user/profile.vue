<template>
  <view class="profile-page">
    <!-- Hero Section with wave clip -->
    <view class="hero-section">
      <view class="hero-bg"></view>
      <!-- SVG Wave -->
      <view class="hero-wave">
        <svg viewBox="0 0 375 40" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0,20 Q93.75,40 187.5,20 Q281.25,0 375,20 L375,40 L0,40 Z" fill="#FFF8F0"/>
        </svg>
      </view>
      <!-- Avatar + Info -->
      <view class="hero-content">
        <view class="avatar-wrap">
          <image
            :src="headerAvatarSrc"
            mode="aspectFill"
            class="avatar-img"
            @error="onHeaderAvatarError"
          />
        </view>
        <text class="nickname">{{ userStore.userInfo?.username || t('user.notLoggedIn') }}</text>
        <text class="bio">{{ userStore.userInfo?.bio || t('user.defaultBio') }}</text>
        <view class="edit-btn" @click="goToEditProfile">
          <text class="edit-btn-text">{{ t('user.editProfile') }}</text>
        </view>
      </view>
    </view>

    <!-- Stats Card (overlapping hero) -->
    <view class="stats-card">
      <view class="stat-item">
        <text class="stat-num">{{ userStore.userInfo?.stats?.receivedLikesCount ?? 0 }}</text>
        <text class="stat-label">{{ t('user.posts') }}</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-num">{{ userStore.userInfo?.stats?.receivedLikesCount ?? 0 }}</text>
        <text class="stat-label">{{ t('user.likes') }}</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-num">{{ userStore.userInfo?.stats?.followingCount ?? 0 }}</text>
        <text class="stat-label">{{ t('user.following') }}</text>
      </view>
      <view class="stat-divider"></view>
      <view class="stat-item">
        <text class="stat-num">{{ userStore.userInfo?.stats?.followerCount ?? 0 }}</text>
        <text class="stat-label">{{ t('user.followers') }}</text>
      </view>
    </view>

    <!-- Function Entry List -->
    <view class="func-card">
      <view class="func-item" @click="goToItinerary">
        <view class="func-icon" style="background: #FFF0E6;">
          <text class="func-emoji">📋</text>
        </view>
        <text class="func-name">{{ t('user.myItinerary') }}</text>
        <view class="func-right">
          <view class="func-badge" v-if="userStore.userInfo?.stats?.postsCount">
            <text class="func-badge-text">{{ userStore.userInfo?.stats?.postsCount }}</text>
          </view>
          <u-icon name="arrow-right" size="16" color="#C4C4C4"></u-icon>
        </view>
      </view>
      <view class="func-divider"></view>
      <view class="func-item" @click="goToPublicHome">
        <view class="func-icon" style="background: #E8F4FD;">
          <text class="func-emoji">👁</text>
        </view>
        <text class="func-name">{{ t('user.viewHome') }}</text>
        <view class="func-right">
          <u-icon name="arrow-right" size="16" color="#C4C4C4"></u-icon>
        </view>
      </view>
      <view class="func-divider"></view>
      <view class="func-item" @click="goToSettings">
        <view class="func-icon" style="background: #F0F0F0;">
          <text class="func-emoji">⚙️</text>
        </view>
        <text class="func-name">{{ t('user.settings') }}</text>
        <view class="func-right">
          <u-icon name="arrow-right" size="16" color="#C4C4C4"></u-icon>
        </view>
      </view>
    </view>

    <!-- Tab Bar (capsule style) -->
    <view class="tab-bar">
      <view
        v-for="(tab, index) in tabsDisplay"
        :key="index"
        class="tab-item"
        :class="{ 'tab-active': currentTab === index }"
        @click="switchTab(index)"
      >
        <text class="tab-text" :class="{ 'tab-text-active': currentTab === index }">{{ tab }}</text>
      </view>
    </view>

    <!-- Content: Waterfall Posts -->
    <view class="content-area">
      <view v-if="postList.length > 0" class="waterfall">
        <view
          v-for="(item, index) in postList"
          :key="item.id"
          class="waterfall-item"
          @click="goToDetail(item.id)"
        >
          <view class="post-card">
            <image
              :src="getDisplayImageUrl(item.image) || `https://picsum.photos/300/400?random=${index}`"
              mode="aspectFill"
              class="post-img"
            />
            <view class="post-info">
              <text class="post-title">{{ item.title }}</text>
              <view class="post-bottom">
                <text class="post-like-icon">❤️</text>
                <text class="post-like-num">{{ item.likes || 0 }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Empty State -->
      <view v-else class="empty-state">
        <view class="empty-icon-wrap">
          <u-icon name="empty-data" size="48" color="#E8A87C"></u-icon>
        </view>
        <text class="empty-text">{{ t('user.emptyText') }}</text>
        <view class="empty-btn" @click="uni.switchTab({url:'/pages/index/index'})">{{ t('user.emptyAction') }}</view>
      </view>
    </view>

    <!-- 自定义 TabBar -->
    <custom-tabbar current="/pages/user/profile" />

    <!-- Bottom Spacer -->
    <view style="height: 80px;"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useUserStore } from "@/stores/user";
import { useI18n } from 'vue-i18n';
// @ts-ignore
import UIcon from "uview-plus/components/u-icon/u-icon.vue";
import { request } from "@/utils/request";
import { getDisplayImageUrl } from "@/utils/imageProxy";

const userStore = useUserStore();
const { t } = useI18n();
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

const tabsDisplay = computed(() => [t('user.tabPosts'), t('user.tabFavorites'), t('user.tabLikes')]);

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

const goToSettings = () => {
  uni.navigateTo({ url: '/pages/settings/index' });
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
.profile-page {
  min-height: 100vh;
  background-color: #FFF8F0;
  position: relative;
  padding-bottom: calc(56px + env(safe-area-inset-bottom));
}

/* ===== Hero Section ===== */
.hero-section {
  position: relative;
  height: 35vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #FFF8F0 0%, #FFF0E6 100%);
}

.hero-wave {
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  z-index: 1;
  line-height: 0;
  svg {
    width: 100%;
    height: 40px;
    display: block;
  }
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: calc(20px + env(safe-area-inset-top));
  padding-bottom: 36px;
}

.avatar-wrap {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 10px;
}

.avatar-img {
  width: 100%;
  height: 100%;
  display: block;
}

.nickname {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.bio {
  font-size: 13px;
  color: #8C8C8C;
  margin-bottom: 12px;
}

.edit-btn {
  padding: 6px 24px;
  background: #fff;
  border: 1.5px solid #E8A87C;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-btn-text {
  font-size: 13px;
  color: #E8A87C;
  font-weight: 600;
}

/* ===== Stats Card ===== */
.stats-card {
  margin: -24px 16px 20px;
  position: relative;
  z-index: 10;
  background: #fff;
  border-radius: 20px;
  padding: 18px 0;
  display: flex;
  align-items: center;
  justify-content: space-around;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-num {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 20px;
  background: #F0F0F0;
}

/* ===== Tab Bar ===== */
.tab-bar {
  display: flex;
  align-items: center;
  margin: 0 16px;
  padding: 4px;
  border-radius: 999px;
  background: #F5F0EB;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 999px;
  transition: all 0.25s ease;
}

.tab-active {
  background: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tab-text {
  font-size: 13px;
  color: #999;
  font-weight: 500;
  transition: color 0.25s ease;
}

.tab-text-active {
  color: #E8A87C;
  font-weight: 600;
}

/* ===== Content Area ===== */
.content-area {
  padding: 8px;
  min-height: 200px;
}

.waterfall {
  display: flex;
  flex-wrap: wrap;
}

.waterfall-item {
  width: 50%;
  padding: 6px;
  box-sizing: border-box;
}

.post-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
}

.post-img {
  width: 100%;
  height: 180px;
  display: block;
  background: #F5F0EB;
}

.post-info {
  padding: 8px 10px 10px;
}

.post-title {
  font-size: 13px;
  color: #3D3D3D;
  font-weight: 600;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.3;
}

.post-bottom {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 6px;
}

.post-like-icon {
  font-size: 12px;
}

.post-like-num {
  font-size: 12px;
  color: #E8A87C;
  font-weight: 500;
}
/* ===== Empty State ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.empty-icon-wrap {
  width: 100px;
  height: 100px;
  background: #FFF0E6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  color: #999;
  margin-bottom: 20px;
}

.empty-btn {
  padding: 8px 28px;
  background: #fff;
  border: 1.5px solid #E8A87C;
  border-radius: 999px;
  font-size: 13px;
  color: #E8A87C;
  font-weight: 600;
}

/* ===== Function Entry Card ===== */
.func-card {
  margin: 16px 16px 24px;
  background: #fff;
  border-radius: 20px;
  padding: 4px 0;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
}

.func-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
}

.func-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.func-emoji {
  font-size: 18px;
}

.func-name {
  flex: 1;
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.func-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.func-badge {
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  background: #FFF0E6;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
}
.func-badge-text {
  font-size: 12px;
  color: #E8A87C;
  font-weight: 600;
}

.func-divider {
  height: 1px;
  background: #F5F0EB;
  margin: 0 16px 0 64px;
}
</style>
