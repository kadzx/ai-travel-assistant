<template>
  <view class="masonry-item" @click="handleClick">
    <!-- 图片区 -->
    <view class="img-wrap">
      <view v-if="!imageLoaded" class="img-skeleton"></view>
      <image
        :src="displayImageUrl"
        mode="widthFix"
        class="item-image"
        :class="imageLoaded ? 'loaded' : ''"
        @load="onImageLoad"
        @error="onImageError"
      />
      <!-- 地点标签：图片右下角 -->
      <view v-if="item.typeLabel || item.type" class="location-tag">
        <text class="location-icon">◉</text>
        <text class="location-text">{{ item.typeLabel || item.type }}</text>
      </view>
    </view>
    <!-- 内容区 -->
    <view class="item-content">
      <text class="item-title">{{ item.title }}</text>
      <view class="bottom-row">
        <view class="user-info">
          <image :src="item.user?.avatar || '/static/logo.png'" mode="aspectFill" class="user-avatar" />
          <text class="user-name">{{ item.user.name }}</text>
        </view>
        <view class="like-btn" @click.stop="toggleLike">
          <u-icon :name="isLiked ? 'heart-fill' : 'heart'" size="14" :color="isLiked ? '#E8A87C' : '#BFBFBF'"></u-icon>
          <text class="like-count" :class="{ liked: isLiked }">{{ formatCount(likeCount) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref, watch, computed } from 'vue';
import { getDisplayImageUrl } from '@/utils/imageProxy';
// @ts-ignore
import UIcon from 'uview-plus/components/u-icon/u-icon.vue';

export interface MasonryItemProps {
  id: number | string;
  image: string;
  title: string;
  type?: string;
  typeLabel?: string;
  tags?: string[];
  user: { id?: number; name: string; avatar: string };
  likes: number | string;
  isLiked?: boolean;
}

const props = defineProps<{ item: MasonryItemProps }>();
const emit = defineEmits(['click', 'like']);
const displayImageUrl = computed(() => getDisplayImageUrl(props.item.image));
const imageLoaded = ref(false);
const isLiked = ref(props.item.isLiked || false);
const likeCount = ref(Number(props.item.likes) || 0);

watch(() => props.item, (v) => {
  isLiked.value = v.isLiked || false;
  likeCount.value = Number(v.likes) || 0;
}, { deep: true });

const formatCount = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
const onImageLoad = () => { imageLoaded.value = true; };
const onImageError = () => { imageLoaded.value = true; };
const handleClick = () => { emit('click', props.item); };
const toggleLike = () => {
  isLiked.value = !isLiked.value;
  likeCount.value += isLiked.value ? 1 : -1;
  emit('like', { ...props.item, isLiked: isLiked.value, likes: likeCount.value });
};
</script>

<style scoped lang="scss">
.masonry-item {
  background: #FFFFFF;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
  &:active { transform: scale(0.98); opacity: 0.95; }
  transition: all 0.2s;
}

/* 图片 */
.img-wrap {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #F5F0EB;
}
.img-skeleton {
  position: absolute; inset: 0;
  background: linear-gradient(110deg, #F5F0EB 30%, #FFF0E6 50%, #F5F0EB 70%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  min-height: 180px;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.item-image {
  width: 100%;
  display: block;
  opacity: 0;
  transition: opacity 0.4s;
  &.loaded { opacity: 1; }
}

/* 地点标签 */
.location-tag {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  padding: 3px 8px;
  border-radius: 10px;
}
.location-icon {
  font-size: 10px;
  color: #E8A87C;
}
.location-text {
  font-size: 10px;
  color: #3D3D3D;
  font-weight: 500;
}

/* 内容 */
.item-content {
  padding: 10px 10px 10px;
}
.item-title {
  font-size: 13px;
  font-weight: 600;
  color: #3D3D3D;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 底部行 */
.bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 1;
  min-width: 0;
}
.user-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #F5F0EB;
  flex-shrink: 0;
}
.user-name {
  font-size: 11px;
  color: #8C8C8C;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 点赞 */
.like-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  padding: 2px;
  &:active { transform: scale(1.15); }
  transition: transform 0.15s;
}
.like-count {
  font-size: 11px;
  color: #BFBFBF;
  &.liked { color: #E8A87C; }
}
</style>
