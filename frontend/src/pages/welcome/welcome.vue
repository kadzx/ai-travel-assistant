<template>
  <view class="welcome-page">
    <!-- 装饰性浮动 blob -->
    <view class="blob-decoration blob-pink animate-float-slow"></view>
    <view class="blob-decoration blob-green animate-float-medium"></view>
    <view class="blob-decoration blob-blue animate-float-fast"></view>

    <!-- 内容区 -->
    <view class="content-area">
      <!-- 顶部装饰小圆 -->
      <view class="deco-circles animate-fade-in-up delay-100">
        <view class="deco-circle deco-circle-1">🎒</view>
        <view class="deco-circle deco-circle-2">🗺️</view>
      </view>

      <!-- 飞机图标 -->
      <view class="icon-wrapper animate-fade-in-up delay-200">
        <text class="icon-plane">✈️</text>
      </view>

      <!-- 品牌名 -->
      <view class="brand-area animate-fade-in-up delay-300">
        <text class="brand-name">AI Travel ✈️</text>
        <text class="brand-slogan">你的 AI 旅行伙伴</text>
        <text class="brand-sub">发现世界，从一次对话开始</text>
      </view>

      <!-- 按钮区 -->
      <view class="btn-area animate-fade-in-up delay-500">
        <button class="start-btn" @click="handleStart">
          <text>开始探索</text>
          <text class="btn-arrow">→</text>
        </button>
        <view class="login-link" @click="handleLogin">
          <text class="login-text">已有账号？<text class="login-highlight">登录</text></text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();

const handleStart = () => {
  if (userStore.token) {
    uni.switchTab({ url: '/pages/index/index' });
  } else {
    uni.redirectTo({ url: '/pages/login/login' });
  }
};

const handleLogin = () => {
  uni.redirectTo({ url: '/pages/login/login' });
};
</script>

<style scoped lang="scss">
.welcome-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF8F0 0%, #FFF0E6 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 装饰 blob */
.blob-pink {
  width: 200px; height: 200px;
  background: rgba(245, 213, 200, 0.5);
  top: -40px; right: -40px;
}
.blob-green {
  width: 160px; height: 160px;
  background: rgba(212, 232, 219, 0.5);
  bottom: 80px; left: -50px;
}
.blob-blue {
  width: 120px; height: 120px;
  background: rgba(223, 232, 240, 0.4);
  top: 30%; left: 60%;
}

.content-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 40px;
  position: relative;
  z-index: 1;
}

/* 装饰小圆 */
.deco-circles { position: relative; width: 100%; height: 60px; margin-bottom: 20px; }
.deco-circle {
  position: absolute;
  width: 40px; height: 40px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
}
.deco-circle-1 { background: #FFF0E6; left: 20%; top: 0; }
.deco-circle-2 { background: #D4E8DB; right: 20%; top: 10px; }

/* 飞机图标 */
.icon-wrapper {
  width: 100px; height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 30px rgba(232, 168, 124, 0.3);
  margin-bottom: 32px;
}
.icon-plane { font-size: 42px; }

/* 品牌 */
.brand-area { text-align: center; margin-bottom: 48px; }
.brand-name {
  display: block;
  font-size: 28px; font-weight: 700;
  color: #3D3D3D;
  margin-bottom: 12px;
  letter-spacing: 1px;
}
.brand-slogan {
  display: block;
  font-size: 16px; color: #8C8C8C;
  margin-bottom: 6px;
}
.brand-sub {
  display: block;
  font-size: 13px; color: #BFBFBF;
}

/* 按钮区 */
.btn-area { width: 100%; }
.start-btn {
  width: 100%;
  height: 52px;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  color: #fff;
  border: none;
  border-radius: 26px;
  font-size: 17px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  gap: 8px;
  box-shadow: 0 6px 20px rgba(232, 168, 124, 0.35);
  transition: all 0.2s ease;
  &:active { transform: scale(0.97); opacity: 0.9; }
}
.btn-arrow { font-size: 20px; }

.login-link {
  text-align: center;
  margin-top: 20px;
  padding: 10px;
}
.login-text { font-size: 14px; color: #8C8C8C; }
.login-highlight { color: #E8A87C; font-weight: 600; }

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
@keyframes float-fast {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

.animate-fade-in-up {
  animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}
.animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
.animate-float-medium { animation: float-medium 5s ease-in-out infinite; }
.animate-float-fast { animation: float-fast 4s ease-in-out infinite; }

.delay-100 { animation-delay: 0.1s; }
.delay-200 { animation-delay: 0.2s; }
.delay-300 { animation-delay: 0.3s; }
.delay-500 { animation-delay: 0.5s; }
</style>
