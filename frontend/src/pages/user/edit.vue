<template>
  <view class="edit-profile-container">
    <!-- 毛玻璃顶栏 -->
    <view class="navbar">
      <view class="status-bar"></view>
      <view class="nav-content">
        <view class="nav-btn back-btn" @click="goBack">
          <u-icon name="arrow-left" size="22" color="#5B4636"></u-icon>
        </view>
        <text class="nav-title">编辑资料</text>
        <view class="nav-btn save-btn" @click="handleSave">
          <u-loading-icon v-if="loading" color="#E8A87C" size="16"></u-loading-icon>
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
              <text class="camera-emoji">📷</text>
            </view>
            <view class="avatar-overlay">
              <text class="overlay-text">更换头像</text>
            </view>
          </view>
        </view>

        <!-- Form Section -->
        <view class="form-card">
          <!-- Nickname -->
          <view class="form-group">
            <view class="form-row">
              <text class="label">昵称</text>
              <view class="input-area">
                <input
                  v-model="form.nickname"
                  type="text"
                  class="custom-input"
                  placeholder="好名字可以让朋友更容易记住你"
                  placeholder-class="input-placeholder"
                  maxlength="20"
                />
              </view>
            </view>
            <text class="counter" :class="{ 'limit': form.nickname.length >= 20 }">{{ form.nickname.length }}/20</text>
          </view>

          <view class="form-divider"></view>

          <!-- Bio -->
          <view class="form-group">
            <text class="label bio-label">简介</text>
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

          <view class="form-divider"></view>

          <!-- Gender -->
          <view class="form-row item-row">
            <text class="label">性别</text>
            <view class="value-display">
              <text class="value-text">保密</text>
              <u-icon name="arrow-right" color="#D4C5B5" size="14"></u-icon>
            </view>
          </view>

          <view class="form-divider"></view>

          <!-- Birthday -->
          <view class="form-row item-row">
            <text class="label">生日</text>
            <view class="value-display">
              <text class="value-text">去填写</text>
              <u-icon name="arrow-right" color="#D4C5B5" size="14"></u-icon>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部装饰 blob -->
      <view class="bottom-blobs">
        <view class="deco-blob deco-blob-1"></view>
        <view class="deco-blob deco-blob-2"></view>
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
/* 奶油极简色板 */
$primary: #E8A87C;
$primary-dark: #D4A574;
$bg: #FFF8F0;
$text-main: #3D2E1F;
$text-secondary: #A89585;
$text-light: #C4B5A5;
$card-bg: #ffffff;

.edit-profile-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $bg;
}

/* 毛玻璃顶栏 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 248, 240, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(232, 168, 124, 0.12);
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
  color: $primary;
  transition: opacity 0.2s;

  &.disabled {
    opacity: 0.3;
    pointer-events: none;
  }
}

/* 滚动区 */
.content-scroll {
  flex: 1;
  height: 0;
}

.content-wrapper {
  padding: 24px 20px 40px;
}

/* 头像区 */
.avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 32px;
}

.avatar-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(232, 168, 124, 0.18);

  &:active {
    transform: scale(0.97);
    transition: transform 0.1s;
  }
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 20px;
  background-color: #FFF0E6;
  border: 3px solid #fff;
}

.camera-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 30px;
  height: 30px;
  background: linear-gradient(135deg, $primary, $primary-dark);
  border-radius: 50%;
  border: 2.5px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(232, 168, 124, 0.35);
  z-index: 2;
}

.camera-emoji {
  font-size: 13px;
  line-height: 1;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.25);
  border-radius: 20px;
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

/* 表单卡片 */
.form-card {
  background: $card-bg;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 2px 16px rgba(232, 168, 124, 0.08);
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-row {
  display: flex;
  align-items: center;
}

.label {
  font-size: 15px;
  font-weight: 500;
  color: $text-main;
  min-width: 48px;
  flex-shrink: 0;
}

.bio-label {
  margin-bottom: 8px;
}

.input-area {
  flex: 1;
  margin-left: 12px;
}

.custom-input {
  width: 100%;
  height: 44px;
  font-size: 15px;
  color: $text-main;
  caret-color: $primary;
}

.counter {
  font-size: 11px;
  color: $text-light;
  text-align: right;
  margin-top: 4px;

  &.limit {
    color: $primary;
  }
}

.form-divider {
  height: 1px;
  background: rgba(232, 168, 124, 0.12);
  margin: 14px 0;
}

.textarea-wrapper {
  background-color: #FFF5ED;
  border-radius: 14px;
  padding: 12px;
  position: relative;
  transition: background-color 0.2s;

  &:focus-within {
    background-color: #FFF0E6;
  }

  .custom-textarea {
    width: 100%;
    height: 80px;
    font-size: 15px;
    line-height: 1.5;
    color: $text-main;
    caret-color: $primary;
  }

  .textarea-counter {
    position: absolute;
    bottom: 8px;
    right: 12px;
    font-size: 11px;
    color: $text-light;
  }
}

.input-placeholder {
  color: $text-light;
  font-size: 14px;
}

/* 行项 */
.item-row {
  justify-content: space-between;
  padding: 4px 0;

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

/* 底部装饰 blob */
.bottom-blobs {
  position: relative;
  height: 120px;
  overflow: hidden;
  pointer-events: none;
}

.deco-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.3;
}

.deco-blob-1 {
  width: 120px;
  height: 120px;
  background: #F8D5D0;
  bottom: -30px;
  left: 20px;
}

.deco-blob-2 {
  width: 90px;
  height: 90px;
  background: #D5ECD4;
  bottom: -10px;
  right: 40px;
}
</style>
