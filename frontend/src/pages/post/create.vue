<template>
  <view class="cream-create">
    <!-- 顶栏：X关闭 + 标题 + 渐变发布按钮 -->
    <view class="cream-navbar">
      <view class="cream-navbar-inner">
        <view class="cream-nav-close" @click="goBack">
          <u-icon name="close" size="22" color="#8B7E74"></u-icon>
        </view>
        <text class="cream-nav-title">{{ t('post.publish') }}</text>
        <view class="cream-nav-publish" :class="{ disabled: !isValid }" @click="handlePublish">
          <u-loading-icon v-if="loading" color="#fff" size="16"></u-loading-icon>
          <text v-else class="cream-nav-publish-txt">{{ t('post.publishBtn') }}</text>
        </view>
      </view>
    </view>

    <scroll-view
      scroll-y
      class="cream-scroll"
      :style="{ height: scrollHeight + 'px' }"
      :scroll-top="scrollTop"
      @scroll="scrollTop = $event.detail.scrollTop"
    >
      <view class="cream-body">
        <!-- 图片区：3列网格 -->
        <view class="cream-section cream-photos">
          <view class="cream-photos-grid">
            <view
              v-for="(item, index) in fileList"
              :key="index"
              class="cream-photo-item"
            >
              <image :src="item.url" mode="aspectFill" class="cream-photo-img" />
              <view class="cream-photo-del" @click.stop="deletePic({ index })">
                <u-icon name="close-circle-fill" size="20" color="rgba(139,126,116,0.7)"></u-icon>
              </view>
            </view>
            <!-- 添加按钮（最后一格） -->
            <view v-if="fileList.length < 9" class="cream-photo-add" @click="triggerUpload">
              <u-icon name="plus" size="28" color="#D4A574"></u-icon>
              <text class="cream-photo-add-txt">{{ t('post.addImage') }}</text>
            </view>
          </view>
          <view v-if="fileList.length > 0" class="cream-photo-tip">{{ t('post.photoTip') }}</view>
        </view>

        <!-- 标题输入 -->
        <view class="cream-section cream-title-wrap">
          <input
            v-model="form.title"
            class="cream-title-input"
            :placeholder="t('post.titlePlaceholder')"
            placeholder-class="cream-placeholder"
            maxlength="20"
          />
        </view>

        <!-- 正文输入（富文本） -->
        <view class="cream-section cream-content-wrap">
          <!-- 工具栏 -->
          <view class="editor-toolbar">
            <view class="toolbar-btn" :class="{ active: formats.bold }" @click="formatText('bold')">
              <text class="toolbar-icon" style="font-weight:bold;">B</text>
            </view>
            <view class="toolbar-btn" :class="{ active: formats.italic }" @click="formatText('italic')">
              <text class="toolbar-icon" style="font-style:italic;">I</text>
            </view>
            <view class="toolbar-btn" :class="{ active: formats.header === 2 }" @click="formatText('header', formats.header === 2 ? false : 2)">
              <text class="toolbar-icon" style="font-weight:600;font-size:13px;">H</text>
            </view>
            <view class="toolbar-divider"></view>
            <view class="toolbar-btn" :class="{ active: formats.list === 'bullet' }" @click="formatText('list', formats.list === 'bullet' ? false : 'bullet')">
              <text class="toolbar-icon">•≡</text>
            </view>
            <view class="toolbar-btn" :class="{ active: formats.list === 'ordered' }" @click="formatText('list', formats.list === 'ordered' ? false : 'ordered')">
              <text class="toolbar-icon">1.</text>
            </view>
            <view class="toolbar-divider"></view>
            <view class="toolbar-btn" :class="{ active: formats.blockquote }" @click="formatText('blockquote')">
              <text class="toolbar-icon" style="font-size:16px;">❝</text>
            </view>
            <view class="toolbar-btn" @click="editorUndo">
              <text class="toolbar-icon" style="font-size:14px;">↩</text>
            </view>
          </view>
          <!-- 编辑器 -->
          <editor
            id="postEditor"
            class="cream-editor"
            :placeholder="t('post.contentPlaceholder')"
            :show-img-size="false"
            :show-img-toolbar="false"
            :show-img-resize="false"
            @ready="onEditorReady"
            @input="onEditorInput"
            @statuschange="onEditorStatusChange"
          />
        </view>

        <!-- 功能行列表 -->
        <view class="cream-section cream-options-card">
          <!-- 添加地点 -->
          <view class="cream-opt" @click="addLocation">
            <text class="cream-opt-emoji">📍</text>
            <text v-if="!form.location" class="cream-opt-label">{{ t('post.location') }}</text>
            <text class="cream-opt-value" :class="{ placeholder: !form.location, 'align-left': !!form.location }">{{ form.location || '' }}</text>
            <text v-if="form.latitude" style="font-size:12px;color:#95B8A3;margin-right:4px;flex-shrink:0;">{{ t('post.located') }}</text>
            <u-icon name="arrow-right" size="14" color="#C4B5A8"></u-icon>
          </view>

          <!-- 添加话题标签 -->
          <view class="cream-opt" @click="addTag">
            <text class="cream-opt-emoji">🏷</text>
            <text class="cream-opt-label">{{ t('post.tags') }}</text>
            <view class="cream-opt-tags" v-if="form.tags.length">
              <view v-for="(tag, i) in form.tags" :key="i" class="cream-tag-chip">
                <text class="cream-tag-text">#{{ tag }}</text>
                <view class="cream-tag-remove" @click.stop="form.tags.splice(i, 1)">
                  <u-icon name="close" size="10" color="#E8A87C"></u-icon>
                </view>
              </view>
            </view>
            <u-icon v-else name="arrow-right" size="14" color="#C4B5A8"></u-icon>
          </view>

          <!-- 选择分类 -->
          <view class="cream-opt" @click="showTypePicker = true">
            <text class="cream-opt-emoji">📂</text>
            <text class="cream-opt-label">{{ t('post.category') }}</text>
            <text class="cream-opt-value" :class="{ placeholder: !form.types.length }">{{ typeLabel }}</text>
            <u-icon name="arrow-right" size="14" color="#C4B5A8"></u-icon>
          </view>

          <!-- 隐私设置 -->
          <view class="cream-opt" @click="showPrivacyPicker = true">
            <text class="cream-opt-emoji">🔒</text>
            <text class="cream-opt-label">{{ t('post.privacy') }}</text>
            <text class="cream-opt-value">{{ privacyLabel }}</text>
            <u-icon name="arrow-right" size="14" color="#C4B5A8"></u-icon>
          </view>
        </view>

        <view class="cream-bottom-pad"></view>
      </view>
    </scroll-view>

    <!-- 分类多选弹层 -->
    <u-popup :show="showTypePicker" @close="showTypePicker = false" round="24" mode="bottom" :closeable="true">
      <view class="cream-popup">
        <view class="cream-popup-handle"></view>
        <text class="cream-popup-title">{{ t('post.categoryTitle') }}</text>
        <view class="cream-type-options">
          <view
            v-for="col in typeColumns"
            :key="col.value"
            class="cream-type-option"
            :class="{ active: form.types.includes(col.value) }"
            @click="toggleType(col.value)"
          >
            <u-icon :name="form.types.includes(col.value) ? 'checkmark-circle-fill' : 'checkmark-circle'" size="18" :color="form.types.includes(col.value) ? '#E8A87C' : '#ddd'"></u-icon>
            <text>{{ col.label }}</text>
          </view>
        </view>
        <view class="cream-popup-footer">
          <view class="cream-popup-btn cancel" @click="showTypePicker = false">{{ t('common.cancel') }}</view>
          <view class="cream-popup-btn confirm" @click="showTypePicker = false">{{ t('common.confirm') }}</view>
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
    <u-popup :show="showTopicPopup" @close="showTopicPopup = false" round="24" mode="center" :closeable="true">
      <view class="cream-popup cream-topic-popup">
        <text class="cream-popup-title">{{ t('post.tagPopupTitle') }}</text>
        <input
          v-model="topicInput"
          class="cream-topic-input"
          :placeholder="t('post.tagPlaceholder')"
          placeholder-class="cream-placeholder"
          maxlength="20"
        />
        <view class="cream-popup-footer">
          <view class="cream-popup-btn cancel" @click="showTopicPopup = false">{{ t('common.cancel') }}</view>
          <view class="cream-popup-btn confirm" @click="confirmTopic">{{ t('common.confirm') }}</view>
        </view>
      </view>
    </u-popup>
    <!-- 自定义 TabBar -->
    <custom-tabbar current="/pages/post/create" />
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useI18n } from 'vue-i18n';
import { createPost } from '@/api/post';
import { getStoredLang } from '@/locale';

const { t } = useI18n();
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
  latitude: null as number | null,
  longitude: null as number | null,
  address: '',
  tags: [] as string[],
  types: ['recommend'] as string[],
  privacy: 'public'
});

const typeColumns = computed(() => [
  { label: t('typeLabels.recommend'), value: 'recommend' },
  { label: t('typeLabels.nearby'), value: 'nearby' },
  { label: t('typeLabels.food'), value: 'food' },
  { label: t('typeLabels.travel'), value: 'travel' },
  { label: t('typeLabels.beauty'), value: 'beauty' }
]);

const privacyColumns = computed(() => [
  { label: t('post.privacyPublic'), value: 'public' },
  { label: t('post.privacyPrivate'), value: 'private' },
  { label: t('post.privacyFriends'), value: 'friends' }
]);

// ===== 富文本编辑器 =====
let editorCtx: any = null;
const formats = ref<any>({});

function onEditorReady() {
  uni.createSelectorQuery()
    .select('#postEditor')
    .context((res: any) => {
      editorCtx = res?.context;
    })
    .exec();
}

function onEditorInput(e: any) {
  // editor 的 input 事件返回 { html, text, delta }
  form.content = e.detail?.html || '';
}

function onEditorStatusChange(e: any) {
  formats.value = e.detail || {};
}

function formatText(name: string, value?: any) {
  if (!editorCtx) return;
  editorCtx.format(name, value !== undefined ? value : !formats.value[name]);
}

function editorUndo() {
  if (!editorCtx) return;
  editorCtx.undo();
}

const isValid = computed(() => {
  // content 现在是 HTML，检查是否有实际文字
  const textContent = form.content.replace(/<[^>]*>/g, '').trim();
  return form.title.trim() && textContent && fileList.value.length > 0;
});

const typeLabel = computed(() => {
  if (!form.types.length) return t('post.categoryPlaceholder');
  return form.types.map(v => typeColumns.value.find(c => c.value === v)?.label).filter(Boolean).join('、');
});

const privacyLabel = computed(() => {
  const item = privacyColumns.value.find(col => col.value === form.privacy);
  return item ? item.label : t('post.privacyPublic');
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
    uni.showToast({ title: t('post.photoMax'), icon: 'none' });
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
    fileList.value.push({ status: 'uploading', message: t('post.uploading'), url: '' });
  });
  for (let i = 0; i < paths.length; i++) {
    try {
      const url = await uploadFilePromise(paths[i]);
      fileList.value[start + i] = { status: 'success', message: '', url };
    } catch (_) {
      fileList.value[start + i] = { status: 'failed', message: t('post.uploadFail'), url: '' };
      uni.showToast({ title: t('post.uploadFail'), icon: 'none' });
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
  uni.navigateTo({
    url: '/pages/common/chooseLocation',
    events: {
      chooseLocation: (data: any) => {
        form.location = data.name || '';
        form.address = data.address || '';
        form.latitude = data.latitude;
        form.longitude = data.longitude;
      }
    }
  });
  // 兼容 eventChannel 不可用的情况
  uni.$once('chooseLocationResult', (data: any) => {
    form.location = data.name || '';
    form.address = data.address || '';
    form.latitude = data.latitude;
    form.longitude = data.longitude;
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
      latitude: form.latitude ?? undefined,
      longitude: form.longitude ?? undefined,
      address: form.address || undefined,
      tags: form.tags?.length ? form.tags : undefined,
      type: form.types[0] || 'recommend',
      privacy: form.privacy,
      lang: getStoredLang()
    });
    uni.showToast({ title: t('post.publishSuccess'), icon: 'success' });
    setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 1000);
  } catch (_) {
    uni.showToast({ title: t('post.publishFail'), icon: 'none' });
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
/* === 奶油极简风格 === */
.cream-create {
  min-height: 100vh;
  background: #FFF8F0;
  position: relative;
  padding-bottom: calc(56px + env(safe-area-inset-bottom));
}

/* 顶栏 */
.cream-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: #FFF8F0;
  padding-top: constant(safe-area-inset-top);
  padding-top: env(safe-area-inset-top);
}
.cream-navbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 52px;
  padding: 0 16px;
}
.cream-nav-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(139, 126, 116, 0.08);
}
.cream-nav-title {
  font-size: 17px;
  font-weight: 600;
  color: #5D4E42;
  letter-spacing: 0.5px;
}
.cream-nav-publish {
  padding: 8px 20px;
  border-radius: 20px;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  box-shadow: 0 2px 8px rgba(212, 165, 116, 0.3);
  &.disabled {
    opacity: 0.5;
  }
}
.cream-nav-publish-txt {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

/* 滚动区 */
.cream-scroll {
  padding-top: calc(52px + constant(safe-area-inset-top));
  padding-top: calc(52px + env(safe-area-inset-top));
}
.cream-body {
  padding: 16px 16px 32px;
}
.cream-section {
  margin-bottom: 16px;
}

/* 图片区：3列网格 */
.cream-photos {
  margin-bottom: 20px;
}
.cream-photos-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.cream-photo-item {
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: #F5EDE4;
}
.cream-photo-img {
  width: 100%;
  height: 100%;
  display: block;
}
.cream-photo-del {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 50%;
}
.cream-photo-add {
  aspect-ratio: 1;
  border: 2px dashed #D4A574;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(212, 165, 116, 0.06);
}
.cream-photo-add-txt {
  font-size: 11px;
  color: #D4A574;
}
.cream-photo-tip {
  font-size: 12px;
  color: #C4B5A8;
  margin-top: 8px;
}

/* 标题输入 */
.cream-title-wrap {
  background: #fff;
  border-radius: 16px;
  padding: 14px 16px;
}
.cream-title-input {
  width: 100%;
  font-size: 17px;
  font-weight: 600;
  color: #3D3028;
  line-height: 1.4;
  min-height: 28px;
  display: block;
  box-sizing: border-box;
}

/* 正文输入 */
.cream-content-wrap {
  background: #fff;
  border-radius: 16px;
  padding: 0;
  min-height: 120px;
  overflow: hidden;
}

/* 富文本工具栏 */
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 12rpx 16rpx;
  border-bottom: 1px solid #F5EDE4;
  background: #FFFBF5;
  flex-wrap: wrap;
}
.toolbar-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  transition: all 0.15s;
}
.toolbar-btn:active { opacity: 0.7; }
.toolbar-btn.active {
  background: rgba(212, 165, 116, 0.15);
}
.toolbar-icon {
  font-size: 15px;
  color: #5D4E42;
}
.toolbar-btn.active .toolbar-icon {
  color: #D4A574;
}
.toolbar-divider {
  width: 1px;
  height: 28rpx;
  background: #E8DDD0;
  margin: 0 6rpx;
}

/* 编辑器 */
.cream-editor {
  width: 100%;
  min-height: 200rpx;
  padding: 14px 16px;
  font-size: 15px;
  color: #5D4E42;
  line-height: 1.7;
}

.cream-placeholder {
  color: #C4B5A8;
}

/* 功能行列表卡片 */
.cream-options-card {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  padding: 4px 0;
}
.cream-opt {
  display: flex;
  align-items: center;
  padding: 15px 16px;
  border-bottom: 1px solid #F5EDE4;
  min-height: 52px;
  box-sizing: border-box;
}
.cream-opt:last-child {
  border-bottom: none;
}
.cream-opt-emoji {
  font-size: 18px;
  width: 28px;
  text-align: center;
  flex-shrink: 0;
}
.cream-opt-label {
  font-size: 15px;
  color: #5D4E42;
  margin-left: 8px;
  flex-shrink: 0;
}
.cream-opt-value {
  flex: 1;
  font-size: 14px;
  color: #5D4E42;
  text-align: right;
  margin-right: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &.placeholder {
    color: #C4B5A8;
  }
  &.align-left {
    text-align: left;
  }
}
.cream-opt-tags {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
  margin-right: 8px;
}

/* 话题标签胶囊 */
.cream-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #FFF0E6;
  border-radius: 14px;
}
.cream-tag-text {
  font-size: 12px;
  color: #E8A87C;
  font-weight: 500;
}
.cream-tag-remove {
  padding: 0 2px;
}

.cream-bottom-pad {
  height: 24px;
}

/* === 弹窗通用 === */
.cream-popup {
  padding: 24px 20px;
  padding-bottom: calc(24px + constant(safe-area-inset-bottom));
  padding-bottom: calc(24px + env(safe-area-inset-bottom));
  background: #FFF8F0;
  border-radius: 24px 24px 0 0;
}
.cream-popup-handle {
  width: 36px;
  height: 4px;
  background: #E0D5CA;
  border-radius: 2px;
  margin: 0 auto 16px;
}
.cream-popup-title {
  display: block;
  font-size: 17px;
  font-weight: 700;
  color: #3D3028;
  margin-bottom: 16px;
  text-align: center;
}
.cream-type-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cream-type-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fff;
  &.active {
    background: #FFF0E6;
  }
  text {
    font-size: 15px;
    color: #5D4E42;
  }
}
.cream-popup-footer {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #F5EDE4;
}
.cream-popup-btn {
  flex: 1;
  height: 44px;
  line-height: 44px;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  border-radius: 14px;
  &.cancel {
    background: #F5EDE4;
    color: #8B7E74;
  }
  &.confirm {
    background: linear-gradient(135deg, #E8A87C, #D4A574);
    color: #fff;
    box-shadow: 0 2px 8px rgba(212, 165, 116, 0.3);
  }
}

/* 话题弹窗（居中模式） */
.cream-topic-popup {
  border-radius: 24px;
  min-width: 300px;
}
.cream-topic-input {
  width: 100%;
  height: 48px;
  padding: 0 14px;
  font-size: 15px;
  color: #5D4E42;
  background: #fff;
  border: 1px solid #F5EDE4;
  border-radius: 14px;
  margin-bottom: 16px;
  box-sizing: border-box;
}
</style>
