<template>
  <view class="container">
    <view class="header" v-if="itinerary">
      <view class="title">{{ itinerary.title }}</view>
      <view class="date-range" v-if="itinerary.start_date && itinerary.end_date">
        {{ formatDate(itinerary.start_date) }} - {{ formatDate(itinerary.end_date) }}
      </view>
    </view>

    <scroll-view scroll-y class="content" v-if="itinerary && itinerary.content">
      <!-- 假设内容是纯文本，或者后续可以优化为富文本或结构化列表 -->
      <!-- 这里做一个简单的结构化展示尝试，如果 content 是 JSON 字符串 -->
      <view v-if="parsedContent" class="timeline">
        <view v-for="(day, index) in parsedContent" :key="index" class="day-item">
          <view class="day-header">Day {{ index + 1 }}</view>
          <view class="day-content">
            <text>{{ day }}</text>
          </view>
        </view>
      </view>
      
      <!-- 如果解析失败或者不是数组，直接显示文本 -->
      <view v-else class="text-content">
        <text>{{ itinerary.content }}</text>
      </view>
    </scroll-view>

    <view class="loading-state" v-else-if="loading">
      <u-loading-icon mode="circle"></u-loading-icon>
    </view>

    <view class="footer-actions" v-if="isPreview">
      <u-button 
        type="primary" 
        text="保存行程" 
        customStyle="border-radius: 24px; background: #FF2442; border: none;"
        @click="handleSave"
        :loading="saving"
      ></u-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onLoad } from '@dcloudio/uni-app';
import { getItineraryDetail, saveItinerary } from '@/api/itinerary';
import { useItineraryStore } from '@/stores/itinerary';

const itineraryStore = useItineraryStore();
const itinerary = ref<any>(null);
const loading = ref(false);
const saving = ref(false);
const isPreview = ref(false); // 是否为预览模式（未保存）

// 页面加载
onLoad((options: any) => {
  if (options.id) {
    // 查看详情模式
    loadDetail(options.id);
  } else if (options.preview) {
    // 预览模式，从 store 获取刚刚生成的行程
    isPreview.value = true;
    if (itineraryStore.currentItinerary) {
      itinerary.value = itineraryStore.currentItinerary;
    } else {
      uni.showToast({ title: '无预览数据', icon: 'none' });
      setTimeout(() => uni.navigateBack(), 1500);
    }
  }
});

const loadDetail = async (id: string) => {
  loading.value = true;
  try {
    const res = await getItineraryDetail(id);
    itinerary.value = res;
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const parsedContent = computed(() => {
  if (!itinerary.value?.content) return null;
  try {
    // 尝试解析 JSON，如果后端返回的是 JSON 格式的字符串
    const content = typeof itinerary.value.content === 'string' 
      ? JSON.parse(itinerary.value.content) 
      : itinerary.value.content;
      
    if (Array.isArray(content)) {
      return content;
    }
    // 如果是对象但有 days 属性
    if (content.days && Array.isArray(content.days)) {
      return content.days;
    }
    return null;
  } catch (e) {
    return null;
  }
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
};

const handleSave = async () => {
  if (!itinerary.value) return;
  saving.value = true;
  try {
    // 调用保存接口
    await saveItinerary({
      title: itinerary.value.title || `${itinerary.value.destination} ${itinerary.value.days}日游`,
      content: JSON.stringify(itinerary.value.content), // 确保存储为字符串
      start_date: new Date().toISOString().split('T')[0], // 默认今天开始，后续可让用户选
      end_date: new Date(Date.now() + (itinerary.value.days * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
    });
    
    uni.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => {
      // 保存成功后跳转到列表页，并关闭当前页
      uni.reLaunch({ url: '/pages/itinerary/list' });
    }, 1500);
  } catch (error) {
    uni.showToast({ title: '保存失败', icon: 'none' });
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f8f8f8;
  display: flex;
  flex-direction: column;
}

.header {
  background-color: #fff;
  padding: 20px;
  margin-bottom: 10px;
  
  .title {
    font-size: 20px;
    font-weight: bold;
    color: #333;
    margin-bottom: 8px;
  }
  
  .date-range {
    font-size: 14px;
    color: #666;
  }
}

.content {
  flex: 1;
  padding: 15px;
  box-sizing: border-box;
}

.timeline {
  .day-item {
    background: #fff;
    border-radius: 12px;
    padding: 15px;
    margin-bottom: 15px;
    
    .day-header {
      font-size: 16px;
      font-weight: bold;
      color: #FF2442;
      margin-bottom: 10px;
      border-bottom: 1px solid #eee;
      padding-bottom: 8px;
    }
    
    .day-content {
      font-size: 14px;
      color: #333;
      line-height: 1.6;
      white-space: pre-wrap;
    }
  }
}

.text-content {
  background: #fff;
  padding: 15px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding-top: 50px;
}

.footer-actions {
  background: #fff;
  padding: 15px 20px;
  padding-bottom: calc(15px + env(safe-area-inset-bottom));
  border-top: 1px solid #eee;
}
</style>
