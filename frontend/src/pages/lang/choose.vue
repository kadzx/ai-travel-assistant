<template>
  <view class="lang-page">
    <!-- 装饰 blob -->
    <view class="blob-decoration blob-pink animate-float-slow"></view>
    <view class="blob-decoration blob-green animate-float-medium"></view>

    <view class="content-area">
      <!-- 地球图标 -->
      <view class="icon-wrapper animate-fade-in-up delay-100">
        <text class="icon-globe">🌍</text>
      </view>

      <!-- 标题 -->
      <view class="title-area animate-fade-in-up delay-200">
        <text class="title">Choose Language</text>
        <text class="title-zh">选择语言</text>
      </view>

      <!-- 语言选项 -->
      <view class="lang-options animate-fade-in-up delay-300">
        <view
          class="lang-card"
          :class="{ active: selected === 'zh' }"
          @click="selected = 'zh'"
        >
          <text class="lang-flag">🇨🇳</text>
          <view class="lang-info">
            <text class="lang-name">中文</text>
            <text class="lang-desc">简体中文</text>
          </view>
          <view v-if="selected === 'zh'" class="lang-check">✓</view>
        </view>

        <view
          class="lang-card"
          :class="{ active: selected === 'en' }"
          @click="selected = 'en'"
        >
          <text class="lang-flag">🇺🇸</text>
          <view class="lang-info">
            <text class="lang-name">English</text>
            <text class="lang-desc">United States</text>
          </view>
          <view v-if="selected === 'en'" class="lang-check">✓</view>
        </view>
      </view>

      <!-- 确认按钮 -->
      <view class="btn-area animate-fade-in-up delay-500">
        <button class="confirm-btn" @click="handleConfirm">
          <text>{{ selected === 'zh' ? '确认选择' : 'Confirm' }}</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { setStoredLang } from '@/locale';

const { locale } = useI18n();
const selected = ref<'zh' | 'en'>('zh');

const handleConfirm = () => {
  // 持久化语言选择
  setStoredLang(selected.value);
  // 切换 i18n locale
  locale.value = selected.value;
  // 跳转到欢迎页
  uni.reLaunch({ url: '/pages/welcome/welcome' });
};
</script>

<style scoped lang="scss">
.lang-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF8F0 0%, #FFF0E6 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.blob-pink {
  width: 180px; height: 180px;
  background: rgba(245, 213, 200, 0.5);
  top: -30px; right: -30px;
}
.blob-green {
  width: 140px; height: 140px;
  background: rgba(212, 232, 219, 0.5);
  bottom: 100px; left: -40px;
}

.content-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 32px;
  position: relative;
  z-index: 1;
  width: 100%;
}

.icon-wrapper {
  width: 90px; height: 90px;
  border-radius: 50%;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 30px rgba(232, 168, 124, 0.3);
  margin-bottom: 28px;
}
.icon-globe { font-size: 40px; }

.title-area {
  text-align: center;
  margin-bottom: 36px;
}
.title {
  display: block;
  font-size: 24px; font-weight: 700;
  color: #3D3D3D;
  margin-bottom: 6px;
}
.title-zh {
  display: block;
  font-size: 15px;
  color: #8C8C8C;
}

.lang-options {
  width: 100%;
  margin-bottom: 40px;
}

.lang-card {
  display: flex;
  align-items: center;
  padding: 18px 20px;
  background: #FFFFFF;
  border-radius: 16px;
  margin-bottom: 14px;
  border: 2px solid transparent;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.25s ease;

  &.active {
    border-color: #E8A87C;
    box-shadow: 0 4px 20px rgba(232, 168, 124, 0.2);
  }
}

.lang-flag {
  font-size: 32px;
  margin-right: 16px;
}

.lang-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.lang-name {
  font-size: 17px;
  font-weight: 600;
  color: #3D3D3D;
}
.lang-desc {
  font-size: 13px;
  color: #8C8C8C;
  margin-top: 2px;
}

.lang-check {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: #E8A87C;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}

.btn-area { width: 100%; }
.confirm-btn {
  width: 100%;
  height: 52px;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  color: #fff;
  border: none;
  border-radius: 26px;
  font-size: 17px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 20px rgba(232, 168, 124, 0.35);
  transition: all 0.2s ease;
  &:active { transform: scale(0.97); opacity: 0.9; }
}

/* 动画 */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes float-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
@keyframes float-medium {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.animate-fade-in-up {
  animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}
.animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
.animate-float-medium { animation: float-medium 5s ease-in-out infinite; }

.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }
.delay-500 { animation-delay: 0.5s; }
</style>
