<template>
  <view class="container">
    <view class="list">
      <view 
        v-for="item in itineraryStore.list" 
        :key="item.id" 
        class="card"
        @click="goToDetail(item.id)"
      >
        <view class="destination">{{ item.destination }}</view>
        <view class="info">
          <text class="days">{{ item.days }}天</text>
          <text class="date">{{ item.created_at }}</text>
        </view>
      </view>
    </view>
    
    <view v-if="itineraryStore.list.length === 0" class="empty">
      <u-empty mode="list" text="暂无行程"></u-empty>
    </view>
    
    <view class="fab-btn" @click="goToCreate">
      <u-icon name="plus" color="#fff" size="24"></u-icon>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { useItineraryStore } from '@/stores/itinerary';

const itineraryStore = useItineraryStore();

onShow(() => {
  itineraryStore.getList();
});

const goToDetail = (id: string) => {
  // uni.navigateTo({ url: `/pages/itinerary/detail?id=${id}` });
  console.log('Navigating to detail', id);
};

const goToCreate = () => {
  uni.navigateTo({ url: '/pages/itinerary/create' });
};
</script>

<style lang="scss" scoped>
.container {
  padding: 15px;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.card {
  background-color: #fff;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
  
  .destination {
    font-size: 18px;
    font-weight: bold;
    color: #333;
    margin-bottom: 10px;
  }
  
  .info {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    color: #999;
  }
}

.empty {
  margin-top: 100px;
}

.fab-btn {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 56px;
  height: 56px;
  background-color: #007aff;
  border-radius: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 10px rgba(0,122,255,0.3);
}
</style>
