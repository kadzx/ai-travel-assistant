<template>
  <view class="container min-h-screen bg-white">
    <!-- Header -->
    <view class="sticky top-0 z-50 bg-white border-b border-gray-100 flex items-center justify-between px-4 py-3 shadow-sm">
      <text class="text-gray-600 text-sm font-medium" @click="handleCancel">取消</text>
      <text class="text-gray-900 text-lg font-bold">发布笔记</text>
      <u-button 
        type="primary" 
        size="mini" 
        :loading="loading" 
        @click="handleSubmit" 
        :disabled="!isValid"
      >发布</u-button>
    </view>

    <!-- Image Upload -->
    <view class="px-4 py-4">
      <scroll-view scroll-x class="whitespace-nowrap pb-2">
        <view class="flex gap-2">
          <!-- Add Button -->
          <view 
            class="w-24 h-24 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center active:bg-gray-100 transition-colors"
            @click="chooseImage"
          >
            <u-icon name="camera-fill" size="28" color="#9ca3af"></u-icon>
            <text class="text-xs text-gray-400 mt-1">添加图片</text>
          </view>
          
          <!-- Image Previews -->
          <view 
            v-for="(img, idx) in images" 
            :key="idx" 
            class="relative w-24 h-24 rounded-lg overflow-hidden shrink-0"
          >
            <image :src="img" mode="aspectFill" class="w-full h-full" @click="previewImage(idx)" />
            <view 
              class="absolute top-1 right-1 bg-black/50 rounded-full p-1"
              @click.stop="removeImage(idx)"
            >
              <u-icon name="close" size="12" color="#fff"></u-icon>
            </view>
          </view>
        </view>
      </scroll-view>
      <text class="text-xs text-gray-400 mt-1 block">最多9张，已选 {{ images.length }} 张</text>
    </view>

    <view class="h-[1px] bg-gray-100 mx-4"></view>

    <!-- Title Input -->
    <view class="px-4 py-3">
      <input 
        v-model="title"
        placeholder="填写标题会有更多赞哦~" 
        class="text-lg font-bold placeholder-gray-300 w-full"
        maxlength="20"
      />
    </view>

    <view class="h-[1px] bg-gray-100 mx-4"></view>

    <!-- Content Input -->
    <view class="px-4 py-3 flex-1 min-h-[200px]">
      <textarea 
        v-model="content"
        placeholder="添加正文，话题，艾特..." 
        class="text-base text-gray-800 placeholder-gray-300 w-full h-full min-h-[150px]"
        maxlength="1000"
        auto-height
      ></textarea>
    </view>

    <view class="h-[1px] bg-gray-100 mx-4"></view>

    <!-- Options -->
    <view class="px-4 py-2">
      <view class="flex items-center justify-between py-3 active:bg-gray-50 transition-colors rounded-lg px-2 -mx-2">
        <view class="flex items-center gap-2">
          <u-icon name="map-fill" size="20" color="#333"></u-icon>
          <text class="text-sm font-medium text-gray-900">添加地点</text>
        </view>
        <view class="flex items-center gap-1">
          <text class="text-xs text-gray-400">选择地点</text>
          <u-icon name="arrow-right" size="12" color="#9ca3af"></u-icon>
        </view>
      </view>
      
      <view class="flex items-center justify-between py-3 active:bg-gray-50 transition-colors rounded-lg px-2 -mx-2">
        <view class="flex items-center gap-2">
          <u-icon name="tags-fill" size="20" color="#333"></u-icon>
          <text class="text-sm font-medium text-gray-900">参与话题</text>
        </view>
         <view class="flex items-center gap-1">
          <text class="text-xs text-gray-400">#京都 #红叶季</text>
          <u-icon name="arrow-right" size="12" color="#9ca3af"></u-icon>
        </view>
      </view>
      
       <view class="flex items-center justify-between py-3 active:bg-gray-50 transition-colors rounded-lg px-2 -mx-2">
        <view class="flex items-center gap-2">
          <u-icon name="eye-fill" size="20" color="#333"></u-icon>
          <text class="text-sm font-medium text-gray-900">谁可以看</text>
        </view>
         <view class="flex items-center gap-1">
          <text class="text-xs text-gray-400">公开</text>
          <u-icon name="arrow-right" size="12" color="#9ca3af"></u-icon>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { createPost } from '@/api/post';
import { BASE_URL } from '@/utils/request';
// @ts-ignore
import UButton from 'uview-plus/components/u-button/u-button.vue';
// @ts-ignore
import UIcon from 'uview-plus/components/u-icon/u-icon.vue';

const title = ref('');
const content = ref('');
const images = ref<string[]>([]);
const loading = ref(false);

const isValid = computed(() => {
  return title.value.trim() && content.value.trim() && images.value.length > 0;
});

const handleCancel = () => {
  uni.navigateBack();
};

const chooseImage = () => {
  uni.chooseImage({
    count: 9 - images.value.length,
    sizeType: ['original', 'compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const tempFilePaths = res.tempFilePaths as string[];
      // Upload each file
      tempFilePaths.forEach(path => {
        uploadFile(path);
      });
    }
  });
};

const uploadFile = (filePath: string) => {
  uni.showLoading({ title: '上传中...' });
  let token = '';
  try {
    const userState = uni.getStorageSync('user');
    if (userState) {
        token = JSON.parse(userState).token;
    }
  } catch(e) {}

  uni.uploadFile({
    url: `${BASE_URL}/upload`, 
    filePath: filePath,
    name: 'file',
    header: {
      'Authorization': `Bearer ${token}`
    },
    success: (uploadFileRes) => {
      try {
        const data = JSON.parse(uploadFileRes.data);
        if (data.code === 200 && data.data && data.data.url) {
          images.value.push(data.data.url);
        } else {
          uni.showToast({ title: '上传失败', icon: 'none' });
        }
      } catch (e) {
        uni.showToast({ title: '上传解析失败', icon: 'none' });
      }
    },
    fail: (err) => {
        console.error(err);
        uni.showToast({ title: '网络错误', icon: 'none' });
    },
    complete: () => {
      uni.hideLoading();
    }
  });
};

const removeImage = (index: number) => {
  images.value.splice(index, 1);
};

const previewImage = (current: number) => {
  uni.previewImage({
    urls: images.value,
    current
  });
};

const handleSubmit = async () => {
  if (!isValid.value) return;
  
  loading.value = true;
  try {
    await createPost({
      title: title.value,
      content: content.value,
      images: images.value
    });
    
    uni.showToast({
      title: '发布成功',
      icon: 'success'
    });
    
    // Refresh home page if needed or just go back
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  } catch (error: any) {
    uni.showToast({
      title: error.message || '发布失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
/* No extra styles needed with UnoCSS */
</style>
