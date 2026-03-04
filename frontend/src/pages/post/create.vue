<template>
  <view class="xhs-create">
    <!-- 无顶栏：左上关闭、右上发布（浮动） -->
    <view class="xhs-float-close" @click="goBack">
      <u-icon name="close" size="24" color="#333"></u-icon>
    </view>
    <view class="xhs-float-publish" @click="handlePublish">
      <u-loading-icon v-if="loading" color="#FF2442" size="18"></u-loading-icon>
      <text v-else class="xhs-float-publish-txt" :class="{ disabled: !isValid }">发布</text>
    </view>

    <scroll-view
      scroll-y
      class="xhs-scroll"
      :style="{ height: scrollHeight + 'px' }"
      :scroll-top="scrollTop"
      @scroll="scrollTop = $event.detail.scrollTop"
    >
      <view class="xhs-body">
        <!-- 1. 图片区：横向滑动，首格为添加 -->
        <view class="xhs-section xhs-photos">
          <scroll-view scroll-x class="xhs-photos-scroll" show-scrollbar="false">
            <view class="xhs-photos-row">
              <view class="xhs-photo-add" @click="triggerUpload">
                <u-icon name="plus" size="32" color="#ccc"></u-icon>
                <text class="xhs-photo-add-txt">添加图片</text>
              </view>
              <view
                v-for="(item, index) in fileList"
                :key="index"
                class="xhs-photo-item"
              >
                <image :src="item.url" mode="aspectFill" class="xhs-photo-img" />
                <view class="xhs-photo-del" @click.stop="deletePic({ index })">
                  <u-icon name="close-circle-fill" size="20" color="rgba(0,0,0,0.5)"></u-icon>
                </view>
              </view>
            </view>
          </scroll-view>
          <view v-if="fileList.length > 0" class="xhs-photo-tip">最多9张，首张为封面</view>
        </view>

        <!-- 2. 标题 -->
        <view class="xhs-section xhs-title-wrap">
          <input
            v-model="form.title"
            class="xhs-title-input"
            placeholder="填写标题，让更多人发现你"
            placeholder-class="xhs-placeholder"
            maxlength="20"
          />
        </view>

        <!-- 3. 正文 -->
        <view class="xhs-section xhs-content-wrap">
          <textarea
            v-model="form.content"
            class="xhs-content-input"
            placeholder="写写你去过的地方、吃过的美食、想分享的心情..."
            placeholder-class="xhs-placeholder"
            maxlength="1000"
            :auto-height="true"
          />
        </view>

        <!-- 4. 话题标签（已选展示 + 添加） -->
        <view class="xhs-section xhs-tags-wrap">
          <view class="xhs-tags-row">
            <view
              v-for="(tag, i) in form.tags"
              :key="i"
              class="xhs-tag-chip"
            >
              <text>#{{ tag }}</text>
              <view class="xhs-tag-remove" @click="form.tags.splice(i, 1)">
                <u-icon name="close" size="12" color="#999"></u-icon>
              </view>
            </view>
            <view class="xhs-tag-add" @click="addTag">
              <u-icon name="plus" size="14" color="#FF2442"></u-icon>
              <text>添加话题</text>
            </view>
          </view>
        </view>

        <!-- 5. 地点、分类、谁可以看 -->
        <view class="xhs-section xhs-options">
          <view class="xhs-opt" @click="addLocation">
            <u-icon name="map" size="18" color="#666"></u-icon>
            <text class="xhs-opt-label">地点</text>
            <text class="xhs-opt-value" :class="{ placeholder: !form.location }">{{ form.location || '添加地点' }}</text>
            <u-icon name="arrow-right" size="14" color="#ccc"></u-icon>
          </view>
          <view class="xhs-opt" @click="showTypePicker = true">
            <u-icon name="grid" size="18" color="#666"></u-icon>
            <text class="xhs-opt-label">分类</text>
            <text class="xhs-opt-value" :class="{ placeholder: !form.types.length }">{{ typeLabel }}</text>
            <u-icon name="arrow-right" size="14" color="#ccc"></u-icon>
          </view>
          <view class="xhs-opt" @click="showPrivacyPicker = true">
            <u-icon name="lock" size="18" color="#666"></u-icon>
            <text class="xhs-opt-label">谁可以看</text>
            <text class="xhs-opt-value">{{ privacyLabel }}</text>
            <u-icon name="arrow-right" size="14" color="#ccc"></u-icon>
          </view>
        </view>

        <view class="xhs-bottom-pad"></view>
      </view>
    </scroll-view>

    <!-- 分类多选弹层 -->
    <u-popup :show="showTypePicker" @close="showTypePicker = false" round="16" mode="bottom" :closeable="true">
      <view class="type-popup">
        <text class="type-popup-title">选择分类（可多选）</text>
        <view class="type-options">
          <view
            v-for="col in typeColumns"
            :key="col.value"
            class="type-option"
            :class="{ active: form.types.includes(col.value) }"
            @click="toggleType(col.value)"
          >
            <u-icon :name="form.types.includes(col.value) ? 'checkmark-circle-fill' : 'checkmark-circle'" size="18" :color="form.types.includes(col.value) ? '#FF2442' : '#ddd'"></u-icon>
            <text>{{ col.label }}</text>
          </view>
        </view>
        <view class="type-popup-footer">
          <view class="type-popup-btn cancel" @click="showTypePicker = false">取消</view>
          <view class="type-popup-btn confirm" @click="showTypePicker = false">确定</view>
        </view>
      </view>
    </u-popup>

    <u-picker
      :show="showPrivacyPicker"
      :columns="[privacyColumns]"
      keyName="label"
      @confirm="confirmPrivacy"
      @cancel="showPrivacyPicker = false"
    />

    <!-- 添加话题弹窗 -->
    <u-popup :show="showTopicPopup" @close="showTopicPopup = false" round="16" mode="center" :closeable="true">
      <view class="topic-popup">
        <text class="topic-popup-title">添加话题</text>
        <input
          v-model="topicInput"
          class="topic-input"
          placeholder="请输入话题名称"
          placeholder-class="topic-placeholder"
          maxlength="20"
        />
        <view class="topic-popup-footer">
          <view class="topic-popup-btn cancel" @click="showTopicPopup = false">取消</view>
          <view class="topic-popup-btn confirm" @click="confirmTopic">确定</view>
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { createPost } from '@/api/post';

const loading = ref(false);
const fileList = ref<any[]>([]);
const showTypePicker = ref(false);
const showPrivacyPicker = ref(false);
const scrollHeight = ref(500);
const scrollTop = ref(0);

const form = reactive({
  title: '',
  content: '',
  images: [] as string[],
  location: '',
  tags: [] as string[],
  types: ['recommend'] as string[],
  privacy: 'public'
});

const typeColumns = [
  { label: '推荐', value: 'recommend' },
  { label: '附近', value: 'nearby' },
  { label: '美食', value: 'food' },
  { label: '旅行', value: 'travel' },
  { label: '彩妆', value: 'beauty' }
];

const privacyColumns = [
  { label: '公开·所有人可见', value: 'public' },
  { label: '私密·仅自己可见', value: 'private' },
  { label: '好友·互相关注可见', value: 'friends' }
];

const isValid = computed(() => {
  return form.title.trim() && form.content.trim() && fileList.value.length > 0;
});

const typeLabel = computed(() => {
  if (!form.types.length) return '请选择';
  return form.types.map(v => typeColumns.find(c => c.value === v)?.label).filter(Boolean).join('、');
});

const privacyLabel = computed(() => {
  const item = privacyColumns.find(col => col.value === form.privacy);
  return item ? item.label : '公开';
});

onMounted(() => {
  try {
    const sys = uni.getSystemInfoSync();
    const statusH = sys.statusBarHeight || 0;
    scrollHeight.value = (sys.windowHeight || 600) - statusH - 52; /* 顶部留出浮动按钮区 */
  } catch (_) {
    scrollHeight.value = 500;
  }
});

onShow(() => {
  scrollTop.value = 1;
  nextTick(() => {
    scrollTop.value = 0;
  });
});

const goBack = () => uni.navigateBack();

function triggerUpload() {
  const left = 9 - fileList.value.length;
  if (left <= 0) {
    uni.showToast({ title: '最多9张', icon: 'none' });
    return;
  }
  uni.chooseImage({
    count: left,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      addAndUploadFiles(res.tempFilePaths || []);
    }
  });
}

async function addAndUploadFiles(paths: string[]) {
  const start = fileList.value.length;
  paths.forEach(() => {
    fileList.value.push({ status: 'uploading', message: '上传中', url: '' });
  });
  for (let i = 0; i < paths.length; i++) {
    try {
      const url = await uploadFilePromise(paths[i]);
      fileList.value[start + i] = { status: 'success', message: '', url };
    } catch (_) {
      fileList.value[start + i] = { status: 'failed', message: '失败', url: '' };
      uni.showToast({ title: '第' + (i + 1) + '张上传失败', icon: 'none' });
    }
  }
}

function uploadFilePromise(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = JSON.parse(uni.getStorageSync('user') || '{}').token;
    uni.uploadFile({
      url: 'http://localhost:3000/api/upload',
      filePath,
      name: 'file',
      header: { Authorization: `Bearer ${token}` },
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          if (data.code === 200 || data.code === 0) {
            resolve(data.data?.url || data.data);
          } else reject(new Error(data.msg || 'Upload failed'));
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Parse error'));
        }
      },
      fail: reject
    });
  });
}

const deletePic = (event: any) => {
  const idx = event.index != null ? event.index : event;
  fileList.value.splice(idx, 1);
};

const showTopicPopup = ref(false);
const topicInput = ref('');

const addTag = () => {
  topicInput.value = '';
  showTopicPopup.value = true;
};

const confirmTopic = () => {
  const name = topicInput.value.trim();
  if (name && !form.tags.includes(name)) form.tags.push(name);
  showTopicPopup.value = false;
};

const addLocation = () => {
  uni.chooseLocation({
    success: (res) => { form.location = res.name; },
    fail: () => {
      uni.showModal({
        title: '添加地点',
        editable: true,
        placeholderText: '请输入地点名称',
        success: (res) => {
          if (res.confirm && res.content) form.location = res.content;
        }
      });
    }
  });
};

const toggleType = (value: string) => {
  const i = form.types.indexOf(value);
  if (i >= 0) form.types.splice(i, 1);
  else form.types.push(value);
  if (form.types.length === 0) form.types.push('recommend');
};

const confirmPrivacy = (e: any) => {
  form.privacy = e.value[0].value;
  showPrivacyPicker.value = false;
};

const handlePublish = async () => {
  if (!isValid.value) return;
  loading.value = true;
  form.images = fileList.value.map(item => item.url).filter(Boolean);
  try {
    await createPost({
      title: form.title,
      content: form.content,
      images: form.images,
      location: form.location || undefined,
      tags: form.tags?.length ? form.tags : undefined,
      type: form.types[0] || 'recommend',
      privacy: form.privacy
    });
    uni.showToast({ title: '发布成功', icon: 'success' });
    setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 1000);
  } catch (_) {
    uni.showToast({ title: '发布失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
.xhs-create {
  min-height: 100vh;
  background: #fff;
  position: relative;
}

.xhs-float-close {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 100;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}
.xhs-float-publish {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 100;
  min-width: 56px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
  padding-right: 16px;
  padding-right: calc(16px + constant(safe-area-inset-right));
  padding-right: calc(16px + env(safe-area-inset-right));
}
.xhs-float-publish-txt {
  font-size: 16px;
  font-weight: 600;
  color: #FF2442;
  &.disabled {
    color: #ffb3bd;
  }
}

.xhs-scroll {
  padding-top: calc(52px + constant(safe-area-inset-top));
  padding-top: calc(52px + env(safe-area-inset-top));
}
.xhs-body {
  padding: 16px 16px 32px;
}

.xhs-section {
  margin-bottom: 20px;
}

/* 图片区 */
.xhs-photos {
  margin-bottom: 24px;
}
.xhs-photos-scroll {
  white-space: nowrap;
  width: 100%;
}
.xhs-photos-row {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}
.xhs-photo-add {
  width: 100px;
  height: 100px;
  min-width: 100px;
  min-height: 100px;
  background: #f7f7f7;
  border: 1px dashed #e0e0e0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.xhs-photo-add-txt {
  font-size: 12px;
  color: #999;
}
.xhs-photo-item {
  width: 100px;
  height: 100px;
  min-width: 100px;
  min-height: 100px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  background: #f0f0f0;
}
.xhs-photo-img {
  width: 100%;
  height: 100%;
  display: block;
}
.xhs-photo-del {
  position: absolute;
  top: 4px;
  right: 4px;
}
.xhs-photo-tip {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

/* 标题 */
.xhs-title-wrap {
  padding: 4px 0;
}
.xhs-title-input {
  width: 100%;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
  min-height: 28px;
  display: block;
  box-sizing: border-box;
}

/* 正文 */
.xhs-content-wrap {
  padding: 12px 0;
  min-height: 120px;
}
.xhs-content-input {
  width: 100%;
  font-size: 15px;
  color: #333;
  line-height: 1.6;
  min-height: 100px;
  display: block;
  box-sizing: border-box;
}

.xhs-placeholder {
  color: #bbb;
}

/* 话题 */
.xhs-tags-wrap {
  padding: 8px 0;
}
.xhs-tags-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}
.xhs-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #fff0f2;
  border-radius: 16px;
  font-size: 13px;
  color: #FF2442;
}
.xhs-tag-remove {
  padding: 0 2px;
}
.xhs-tag-add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px dashed #FF2442;
  border-radius: 16px;
  font-size: 13px;
  color: #FF2442;
}

/* 选项行 */
.xhs-options {
  background: #fafafa;
  border-radius: 12px;
  overflow: hidden;
  margin-top: 8px;
}
.xhs-opt {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
  min-height: 52px;
  box-sizing: border-box;
}
.xhs-opt:last-child {
  border-bottom: none;
}
.xhs-opt-label {
  font-size: 15px;
  color: #333;
  margin-left: 10px;
  width: 72px;
  flex-shrink: 0;
}
.xhs-opt-value {
  flex: 1;
  font-size: 14px;
  color: #333;
  text-align: right;
  margin-right: 8px;
  &.placeholder {
    color: #999;
  }
}

.xhs-bottom-pad {
  height: 24px;
}

/* 弹窗样式沿用 */
.type-popup, .topic-popup {
  padding: 24px 20px;
  background: #fff;
  border-radius: 16px;
}
.type-popup-title, .topic-popup-title {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 16px;
  text-align: center;
}
.type-options {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.type-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f6f7f9;
  &.active {
    background: #fff0f2;
  }
  text {
    font-size: 15px;
    color: #333;
  }
}
.type-popup-footer, .topic-popup-footer {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
.type-popup-btn, .topic-popup-btn {
  flex: 1;
  height: 44px;
  line-height: 44px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  &.cancel {
    background: #f0f0f0;
    color: #666;
  }
  &.confirm {
    background: #FF2442;
    color: #fff;
  }
}
.topic-input {
  width: 100%;
  height: 48px;
  padding: 0 14px;
  font-size: 15px;
  color: #333;
  background: #f6f7f9;
  border-radius: 12px;
  margin-bottom: 16px;
  box-sizing: border-box;
}
.topic-placeholder {
  color: #999;
}
</style>
