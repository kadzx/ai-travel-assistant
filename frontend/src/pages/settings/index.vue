<template>
  <view class="settings-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="h-[var(--status-bar-height)]"></view>
      <view class="nav-inner">
        <view class="nav-back" @click="goBack">
          <u-icon name="arrow-left" size="20" color="#3D3D3D"></u-icon>
        </view>
        <text class="nav-title">{{ t('settings.title') }}</text>
        <view class="nav-placeholder"></view>
      </view>
    </view>

    <!-- 设置列表 -->
    <view class="settings-card">
      <!-- 语言设置 -->
      <view class="setting-item" @click="showLangPicker = true">
        <view class="setting-icon" style="background: #FFF0E6;">
          <text class="setting-emoji">🌍</text>
        </view>
        <view class="setting-info">
          <text class="setting-name">{{ t('settings.language') }}</text>
          <text class="setting-value">{{ currentLangLabel }}</text>
        </view>
        <u-icon name="arrow-right" size="16" color="#C4C4C4"></u-icon>
      </view>

      <view class="setting-divider"></view>

      <!-- 关于 -->
      <view class="setting-item">
        <view class="setting-icon" style="background: #E8F4FD;">
          <text class="setting-emoji">ℹ️</text>
        </view>
        <view class="setting-info">
          <text class="setting-name">{{ t('settings.about') }}</text>
          <text class="setting-value">v1.0.0</text>
        </view>
        <u-icon name="arrow-right" size="16" color="#C4C4C4"></u-icon>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-area" v-if="userStore.token">
      <button class="logout-btn" @click="handleLogout">
        {{ t('user.logout') }}
      </button>
    </view>

    <!-- 语言选择弹窗 -->
    <view v-if="showLangPicker" class="lang-mask" @click="showLangPicker = false">
      <view class="lang-popup" @click.stop>
        <text class="popup-title">{{ t('settings.switchLang') }}</text>
        <view
          class="popup-option"
          :class="{ active: currentLang === 'zh' }"
          @click="switchLang('zh')"
        >
          <text class="popup-flag">🇨🇳</text>
          <text class="popup-name">中文</text>
          <view v-if="currentLang === 'zh'" class="popup-check">✓</view>
        </view>
        <view
          class="popup-option"
          :class="{ active: currentLang === 'en' }"
          @click="switchLang('en')"
        >
          <text class="popup-flag">🇺🇸</text>
          <text class="popup-name">English</text>
          <view v-if="currentLang === 'en'" class="popup-check">✓</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/user';
import { setStoredLang, getStoredLang } from '@/locale';
// @ts-ignore
import UIcon from 'uview-plus/components/u-icon/u-icon.vue';

const { t, locale } = useI18n();
const userStore = useUserStore();
const showLangPicker = ref(false);
const currentLang = ref<'zh' | 'en'>(getStoredLang());

const currentLangLabel = computed(() => {
  return currentLang.value === 'zh' ? '中文' : 'English';
});

const switchLang = (lang: 'zh' | 'en') => {
  currentLang.value = lang;
  setStoredLang(lang);
  locale.value = lang;
  showLangPicker.value = false;
  // reLaunch 刷新整个应用以确保所有页面应用新语言
  setTimeout(() => {
    uni.reLaunch({ url: '/pages/index/index' });
  }, 300);
};

const goBack = () => {
  uni.navigateBack();
};

const handleLogout = () => {
  userStore.logout();
};
</script>

<style scoped lang="scss">
.settings-page {
  min-height: 100vh;
  background: #FFF8F0;
}

.nav-bar {
  background: #FFF8F0;
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}
.nav-back {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
}
.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #3D3D3D;
}
.nav-placeholder { width: 36px; }

.settings-card {
  margin: 16px;
  background: #fff;
  border-radius: 20px;
  padding: 4px 0;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04);
}

.setting-item {
  display: flex;
  align-items: center;
  padding: 16px;
}

.setting-icon {
  width: 40px; height: 40px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-right: 14px;
  flex-shrink: 0;
}
.setting-emoji { font-size: 20px; }

.setting-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.setting-name {
  font-size: 15px;
  color: #333;
  font-weight: 500;
}
.setting-value {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}

.setting-divider {
  height: 1px;
  background: #F5F0EB;
  margin: 0 16px 0 70px;
}

.logout-area {
  margin: 32px 16px;
}
.logout-btn {
  width: 100%;
  height: 48px;
  background: #fff;
  border: 1.5px solid #FF6B6B;
  border-radius: 24px;
  color: #FF6B6B;
  font-size: 15px;
  font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}

/* 语言选择弹窗 */
.lang-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.lang-popup {
  width: 100%;
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 24px 20px calc(24px + env(safe-area-inset-bottom));
}
.popup-title {
  font-size: 17px;
  font-weight: 600;
  color: #3D3D3D;
  text-align: center;
  margin-bottom: 20px;
}
.popup-option {
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: 14px;
  margin-bottom: 8px;
  transition: all 0.2s;
  &.active {
    background: #FFF8F0;
  }
}
.popup-flag { font-size: 28px; margin-right: 14px; }
.popup-name { flex: 1; font-size: 16px; color: #3D3D3D; font-weight: 500; }
.popup-check {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: #E8A87C;
  color: #fff;
  font-size: 14px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
</style>
