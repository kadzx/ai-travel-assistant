<template>
  <view class="custom-tabbar safe-area-bottom">
    <view
      v-for="(tab, index) in tabs"
      :key="index"
      class="tab-item"
      @click="switchTab(tab)"
    >
      <!-- 发布按钮：凸起渐变圆形 -->
      <template v-if="tab.isPublish">
        <view class="publish-btn">
          <u-icon name="edit-pen" size="22" color="#FFFFFF"></u-icon>
        </view>
        <text class="tab-label publish-label">{{ tab.text }}</text>
      </template>
      <!-- 普通 Tab -->
      <template v-else>
        <u-icon
          :name="currentPath === tab.path ? tab.activeIcon : tab.icon"
          size="24"
          :color="currentPath === tab.path ? '#E8A87C' : '#BFBFBF'"
        ></u-icon>
        <text class="tab-label" :class="{ 'tab-label-active': currentPath === tab.path }">{{ tab.text }}</text>
      </template>
    </view>
  </view>
</template>

<script setup lang="ts">
// @ts-ignore
import UIcon from 'uview-plus/components/u-icon/u-icon.vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const props = defineProps<{ current: string }>();
const currentPath = props.current;

const tabs = computed(() => [
  { path: '/pages/index/index', icon: 'home', activeIcon: 'home-fill', text: t('tabbar.home'), isPublish: false },
  { path: '/pages/post/create', icon: 'edit-pen', activeIcon: 'edit-pen-fill', text: t('tabbar.publish'), isPublish: true },
  { path: '/pages/chat/chat', icon: 'chat', activeIcon: 'chat-fill', text: t('tabbar.chat'), isPublish: false },
  { path: '/pages/user/profile', icon: 'account', activeIcon: 'account-fill', text: t('tabbar.me'), isPublish: false },
]);

const switchTab = (tab: typeof tabs[0]) => {
  if (tab.path === currentPath) return;
  uni.switchTab({ url: tab.path });
};
</script>

<style lang="scss" scoped>
.custom-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 56px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(0, 0, 0, 0.04);
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 56px;
  position: relative;
  transition: all 0.2s;
  &:active { transform: scale(0.92); }
}

/* 发布按钮凸起 */
.publish-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -20px;
  box-shadow: 0 4px 16px rgba(232, 168, 124, 0.4);
  transition: all 0.2s;
  &:active { transform: scale(0.9); }
}
.publish-label {
  color: #E8A87C !important;
  margin-top: 2px;
}

.tab-label {
  font-size: 10px;
  color: #BFBFBF;
  margin-top: 3px;
  transition: color 0.2s;
}
.tab-label-active {
  color: #E8A87C;
}
</style>
