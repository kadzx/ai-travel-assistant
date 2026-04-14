<template>
  <view class="reset-page">
    <view class="top-decoration">
      <view class="arc-bg"></view>
      <view class="top-icon">🔑</view>
      <text class="top-title">{{ step === 1 ? '找回密码' : '设置新密码' }}</text>
      <text class="top-subtitle">{{ step === 1 ? '输入注册时使用的邮箱' : `重置 ${verifiedEmail} 的密码` }}</text>
    </view>

    <view class="form-area">
      <!-- Step 1: 验证邮箱 -->
      <template v-if="step === 1">
        <view class="input-card">
          <text class="input-emoji">📧</text>
          <input
            v-model="email"
            type="text"
            placeholder="请输入邮箱"
            class="input-field"
          />
        </view>
        <view class="submit-btn" :class="{ disabled: !email.trim() || loading }" @click="handleVerifyEmail">
          <text class="submit-text">{{ loading ? '验证中...' : '下一步' }}</text>
        </view>
      </template>

      <!-- Step 2: 设置新密码 -->
      <template v-else>
        <view class="input-card">
          <text class="input-emoji">🔒</text>
          <input
            v-model="newPassword"
            type="password"
            placeholder="新密码（至少6位）"
            class="input-field"
          />
        </view>
        <view class="input-card">
          <text class="input-emoji">🔒</text>
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="确认新密码"
            class="input-field"
          />
        </view>
        <view class="submit-btn" :class="{ disabled: !canReset || loading }" @click="handleResetPassword">
          <text class="submit-text">{{ loading ? '重置中...' : '重置密码' }}</text>
        </view>
      </template>

      <view class="back-link" @click="goBack">
        <text class="back-text">← 返回登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import http from '@/utils/request';

const step = ref(1);
const email = ref('');
const verifiedEmail = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);

const canReset = computed(() => {
  return newPassword.value.length >= 6 && newPassword.value === confirmPassword.value;
});

const handleVerifyEmail = async () => {
  if (!email.value.trim() || loading.value) return;
  loading.value = true;
  try {
    await http.post('/auth/forgot-password', { email: email.value.trim() });
    verifiedEmail.value = email.value.trim();
    step.value = 2;
  } catch (e: any) {
    uni.showToast({ title: '该邮箱未注册', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const handleResetPassword = async () => {
  if (!canReset.value || loading.value) return;
  if (newPassword.value !== confirmPassword.value) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    await http.post('/auth/reset-password', {
      email: verifiedEmail.value,
      password: newPassword.value,
    });
    uni.showToast({ title: '密码重置成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1500);
  } catch (e: any) {
    uni.showToast({ title: '重置失败，请重试', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const goBack = () => uni.navigateBack();
</script>

<style scoped lang="scss">
.reset-page {
  min-height: 100vh;
  background: #FFF8F0;
}

.top-decoration {
  position: relative;
  padding: 120rpx 40rpx 60rpx;
  text-align: center;
  overflow: hidden;
}

.arc-bg {
  position: absolute;
  top: -100rpx;
  left: -10%;
  width: 120%;
  height: 400rpx;
  background: linear-gradient(135deg, #FFF0E6, #F5EDE4);
  border-radius: 0 0 50% 50%;
}

.top-icon {
  position: relative;
  font-size: 60rpx;
  margin-bottom: 16rpx;
}

.top-title {
  position: relative;
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #3D3028;
  margin-bottom: 8rpx;
}

.top-subtitle {
  position: relative;
  display: block;
  font-size: 24rpx;
  color: #BFBFBF;
}

.form-area {
  padding: 40rpx;
}

.input-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 24rpx;
  padding: 0 28rpx;
  height: 100rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
  border: 2rpx solid #FFF0E6;
}

.input-emoji {
  font-size: 36rpx;
  margin-right: 20rpx;
}

.input-field {
  flex: 1;
  font-size: 28rpx;
  color: #3D3028;
  background: transparent;
}

.submit-btn {
  margin-top: 32rpx;
  height: 96rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(232, 168, 124, 0.3);
  transition: all 0.3s;

  &.disabled {
    opacity: 0.5;
  }
}

.submit-text {
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
}

.back-link {
  margin-top: 40rpx;
  text-align: center;
}

.back-text {
  font-size: 26rpx;
  color: #D4A574;
  font-weight: 500;
}
</style>
