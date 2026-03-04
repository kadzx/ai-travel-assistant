<template>
  <view class="edit-profile-container">
    <!-- Navbar -->
    <view class="navbar">
      <view class="status-bar"></view>
      <view class="nav-content">
        <view class="nav-btn back-btn" @click="goBack">
          <u-icon name="arrow-left" size="22" color="#1a1a1a"></u-icon>
        </view>
        <text class="nav-title">编辑资料</text>
        <view class="nav-btn save-btn" @click="handleSave">
          <u-loading-icon v-if="loading" color="#FF2442" size="16"></u-loading-icon>
          <text v-else class="save-text" :class="{ 'disabled': !hasChanges }">完成</text>
        </view>
      </view>
    </view>

    <!-- Main Content -->
    <scroll-view scroll-y class="content-scroll">
      <view class="content-wrapper">
        <!-- Avatar Section -->
        <view class="avatar-section">
          <view class="avatar-wrapper" @click="handleUploadAvatar">
            <image
              :src="form.avatar || '/static/logo.png'"
              mode="aspectFill"
              class="avatar-img"
            />
            <view class="camera-badge">
              <u-icon name="camera-fill" color="#ffffff" size="14"></u-icon>
            </view>
            <view class="avatar-overlay">
              <text class="overlay-text">更换头像</text>
            </view>
          </view>
        </view>

        <!-- Form Section -->
        <view class="form-section">
          <!-- Nickname Group -->
          <view class="form-group">
            <view class="group-header">
              <text class="label">名字</text>
              <text class="counter" :class="{ 'limit': form.nickname.length >= 20 }">{{ form.nickname.length }}/20</text>
            </view>
            <view class="input-wrapper">
              <input
                v-model="form.nickname"
                type="text"
                class="custom-input"
                placeholder="好名字可以让朋友更容易记住你"
                placeholder-class="input-placeholder"
                maxlength="20"
              />
              <view class="input-line"></view>
            </view>
          </view>

          <!-- Bio Group -->
          <view class="form-group">
            <view class="group-header">
              <text class="label">简介</text>
            </view>
            <view class="textarea-wrapper">
              <textarea
                v-model="form.bio"
                class="custom-textarea"
                placeholder="填写简介更容易获得关注哦..."
                placeholder-class="input-placeholder"
                maxlength="100"
                :disable-default-padding="true"
              ></textarea>
              <text class="textarea-counter">{{ form.bio?.length || 0 }}/100</text>
            </view>
          </view>

          <!-- Gender Group (Mock) -->
          <view class="form-item-row">
            <text class="label">性别</text>
            <view class="value-display">
              <text class="value-text">保密</text>
              <u-icon name="arrow-right" color="#cccccc" size="14"></u-icon>
            </view>
          </view>
          
          <!-- Birthday Group (Mock) -->
          <view class="form-item-row">
            <text class="label">生日</text>
            <view class="value-display">
              <text class="value-text">去填写</text>
              <u-icon name="arrow-right" color="#cccccc" size="14"></u-icon>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import { request } from '@/utils/request';

const userStore = useUserStore();
const loading = ref(false);

const form = reactive({
  nickname: '',
  avatar: '',
  bio: ''
});

// To track changes
const initialForm = reactive({
  nickname: '',
  avatar: '',
  bio: ''
});

const hasChanges = computed(() => {
  return form.nickname !== initialForm.nickname || 
         form.avatar !== initialForm.avatar || 
         form.bio !== initialForm.bio;
});

onMounted(() => {
  if (userStore.userInfo) {
    const { nickname, username, avatar, bio } = userStore.userInfo;
    form.nickname = nickname || username || '';
    form.avatar = avatar || '';
    form.bio = bio || '';
    
    // Save initial state
    Object.assign(initialForm, form);
  }
});

const goBack = () => {
  if (hasChanges.value) {
    uni.showModal({
      title: '提示',
      content: '资料未保存，确定要退出吗？',
      success: (res) => {
        if (res.confirm) {
          uni.navigateBack();
        }
      }
    });
  } else {
    uni.navigateBack();
  }
};

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB 原始文件
const MAX_AVATAR_DATAURL_LEN = 7 * 1024 * 1024; // base64 后约 6.67MB 上限

function filePathToBase64DataUrl(tempFilePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // 非 H5：使用 getFileSystemManager 读文件为 base64
    const fs = (uni as any).getFileSystemManager?.();
    if (fs) {
      const ext = (tempFilePath.split('.').pop() || 'jpg').toLowerCase();
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      fs.readFile({
        filePath: tempFilePath,
        encoding: 'base64',
        success: (res: any) => {
          const base64 = (res && res.data) ? res.data : res;
          resolve(`data:${mime};base64,${base64}`);
        },
        fail: (err: any) => reject(err)
      });
      return;
    }
    // H5：通过 canvas 转 data URL（tempFilePath 多为 blob URL）
    const img = new (window as any).Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const max = 800;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (w > max || h > max) {
        if (w > h) {
          h = (h * max) / w;
          w = max;
        } else {
          w = (w * max) / h;
          h = max;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl);
    };
    img.onerror = () => reject(new Error('image load'));
    img.src = tempFilePath;
  });
}

const handleUploadAvatar = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const tempFilePath = res.tempFilePaths[0];
      const size = (res.tempFiles && res.tempFiles[0]?.size) || 0;
      if (size > MAX_AVATAR_SIZE) {
        uni.showToast({ title: '图片不能超过 5MB', icon: 'none' });
        return;
      }
      uni.showLoading({ title: '处理中...', mask: true });
      try {
        const dataUrl = await filePathToBase64DataUrl(tempFilePath);
        if (dataUrl.length > MAX_AVATAR_DATAURL_LEN) {
          uni.showToast({ title: '图片不能超过 5MB', icon: 'none' });
          return;
        }
        form.avatar = dataUrl;
        uni.showToast({ title: '已选为头像', icon: 'success' });
      } catch (e) {
        uni.showToast({ title: '图片读取失败', icon: 'none' });
      } finally {
        uni.hideLoading();
      }
    }
  });
};

const handleSave = async () => {
  if (!hasChanges.value) return;
  if (!form.nickname.trim()) {
    uni.showToast({ title: '名字不能为空', icon: 'none' });
    return;
  }
  if (!form.avatar?.trim()) {
    uni.showToast({ title: '请先上传头像', icon: 'none' });
    return;
  }

  if (loading.value) return;
  loading.value = true;
  
  try {
    const res: any = await request({
      url: '/user/profile',
      method: 'PUT',
      data: {
        nickname: form.nickname,
        avatar: form.avatar,
        bio: form.bio
      }
    });

    if (res && (res.id || res.username)) {
       await userStore.getUserInfo();
       // Reset initial state
       Object.assign(initialForm, form);
       uni.showToast({ title: '保存成功', icon: 'success' });
       setTimeout(() => {
         uni.navigateBack();
       }, 800);
    } else {
       uni.showToast({ title: '保存失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Save failed:', error);
    uni.showToast({ title: '保存出错', icon: 'none' });
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
/* Variables */
$primary-color: #FF2442;
$text-main: #1a1a1a;
$text-secondary: #999999;
$border-color: #f5f5f5;
$bg-color: #ffffff;

.edit-profile-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $bg-color;
}

/* Navbar */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
}

.status-bar {
  height: var(--status-bar-height);
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 16px;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-width: 40px;
  
  &.back-btn {
    justify-content: flex-start;
  }
  
  &.save-btn {
    justify-content: flex-end;
  }
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
  color: $text-main;
}

.save-text {
  font-size: 16px;
  font-weight: 600;
  color: $primary-color;
  transition: opacity 0.2s;
  
  &.disabled {
    opacity: 0.3;
    pointer-events: none;
  }
}

/* Main Content */
.content-scroll {
  flex: 1;
  height: 0;
}

.content-wrapper {
  padding: 24px 20px 40px;
}

/* Avatar Section */
.avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
}

.avatar-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  
  &:active {
    transform: scale(0.98);
    transition: transform 0.1s;
  }
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: #f8f8f8;
  border: 1px solid rgba(0,0,0,0.03);
}

.camera-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28px;
  height: 28px;
  background-color: $primary-color;
  border-radius: 50%;
  border: 2px solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(255, 36, 66, 0.3);
  z-index: 2;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  
  .overlay-text {
    color: #fff;
    font-size: 12px;
    font-weight: 500;
  }
}

.avatar-wrapper:active .avatar-overlay {
  opacity: 1;
}

/* Form Section */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  
  .label {
    font-size: 14px;
    font-weight: 500;
    color: $text-main;
  }
  
  .counter {
    font-size: 12px;
    color: $text-secondary;
    
    &.limit {
      color: $primary-color;
    }
  }
}

.input-wrapper {
  position: relative;
  
  .custom-input {
    width: 100%;
    height: 44px;
    font-size: 16px;
    color: $text-main;
    caret-color: $primary-color;
  }
  
  .input-line {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background-color: $border-color;
    transition: background-color 0.2s;
  }
  
  .custom-input:focus + .input-line {
    background-color: $primary-color;
    height: 1.5px;
  }
}

.textarea-wrapper {
  background-color: #f9f9f9;
  border-radius: 12px;
  padding: 12px;
  position: relative;
  transition: background-color 0.2s;
  
  &:focus-within {
    background-color: #f5f5f5;
  }
  
  .custom-textarea {
    width: 100%;
    height: 80px;
    font-size: 15px;
    line-height: 1.5;
    color: $text-main;
    caret-color: $primary-color;
  }
  
  .textarea-counter {
    position: absolute;
    bottom: 8px;
    right: 12px;
    font-size: 11px;
    color: $text-secondary;
  }
}

.input-placeholder {
  color: #cccccc;
  font-size: 15px;
}

/* List Items */
.form-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  
  .label {
    font-size: 15px;
    font-weight: 500;
    color: $text-main;
  }
  
  .value-display {
    display: flex;
    align-items: center;
    gap: 4px;
    
    .value-text {
      font-size: 14px;
      color: $text-secondary;
    }
  }
}
</style>
