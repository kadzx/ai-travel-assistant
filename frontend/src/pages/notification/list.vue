<template>
  <view class="min-h-screen bg-[#F6F7F9] flex flex-col">
    <view class="sticky top-0 z-10 bg-[#F6F7F9]/95 border-b border-gray-200/50">
      <view class="h-[var(--status-bar-height)]"></view>
      <view class="px-4 py-3 flex items-center">
        <view class="w-[40px] h-[40px] flex items-center justify-center active:opacity-70" @click="goBack">
          <u-icon name="arrow-left" size="22" color="#333"></u-icon>
        </view>
        <text class="flex-1 text-center text-[17px] font-bold text-gray-900">通知</text>
        <view class="w-[40px] h-[40px]"></view>
      </view>
    </view>
    <view class="flex-1 flex flex-col items-center justify-center py-20 px-6">
      <view class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <u-icon name="bell" size="40" color="#d1d5db"></u-icon>
      </view>
      <text class="text-gray-500 text-[15px] text-center">通知功能敬请期待</text>
      <text class="text-gray-400 text-[13px] mt-2 text-center">点赞、评论等通知将在此展示</text>
    </view>
  </view>
</template>

<script setup lang="ts">
const goBack = () => {
  uni.navigateBack();
};
</script>
