<template>
  <view class="page-state">
    <!-- Loading -->
    <view v-if="status === 'loading'" class="state-wrap">
      <view class="loading-dots">
        <view class="dot" v-for="i in 3" :key="i"></view>
      </view>
      <text class="state-text">{{ loadingText }}</text>
    </view>

    <!-- Error -->
    <view v-else-if="status === 'error'" class="state-wrap">
      <text class="state-icon">😵</text>
      <text class="state-title">{{ errorTitle }}</text>
      <text class="state-text">{{ errorText }}</text>
      <view class="retry-btn" @click="$emit('retry')">
        <text class="retry-text">重新加载</text>
      </view>
    </view>

    <!-- Empty -->
    <view v-else-if="status === 'empty'" class="state-wrap">
      <text class="state-icon">{{ emptyIcon }}</text>
      <text class="state-title">{{ emptyTitle }}</text>
      <text class="state-text">{{ emptyText }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps({
  status: { type: String, default: 'loading' },
  loadingText: { type: String, default: '加载中...' },
  errorTitle: { type: String, default: '加载失败' },
  errorText: { type: String, default: '网络不太给力，点击重试' },
  emptyIcon: { type: String, default: '🍃' },
  emptyTitle: { type: String, default: '这里空空如也' },
  emptyText: { type: String, default: '' },
});

defineEmits(['retry']);
</script>

<style scoped lang="scss">
.page-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400rpx;
  padding: 60rpx 40rpx;
}

.state-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.state-icon {
  font-size: 80rpx;
  margin-bottom: 8rpx;
}

.state-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #5B4636;
}

.state-text {
  font-size: 24rpx;
  color: #BFBFBF;
  text-align: center;
}

/* Loading dots */
.loading-dots {
  display: flex;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #E8A87C;
  animation: dot-bounce 1.2s ease-in-out infinite;

  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.4s; }
}

@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* Retry button */
.retry-btn {
  margin-top: 24rpx;
  padding: 16rpx 48rpx;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  border-radius: 999rpx;
  box-shadow: 0 4rpx 16rpx rgba(232, 168, 124, 0.3);
}

.retry-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #fff;
}
</style>
