<template>
  <view 
    class="masonry-item break-inside-avoid mb-3 bg-white rounded-xl overflow-hidden box-border transition-all duration-300 active:scale-[0.98] active:opacity-90 relative group shadow-sm hover:shadow-md"
    @click="handleClick"
  >
    <!-- Image Container -->
    <view class="relative w-full overflow-hidden bg-gray-100">
      <!-- Loading Placeholder -->
      <view 
        v-if="!imageLoaded"
        class="absolute inset-0 bg-gray-200 animate-pulse z-10"
        style="min-height: 200px;"
      ></view>
      
      <image 
        :src="displayImageUrl" 
        mode="widthFix" 
        class="w-full block object-cover will-change-transform transition-opacity duration-500"
        :class="imageLoaded ? 'opacity-100' : 'opacity-0'"
        style="min-height: 120px;"
        @load="onImageLoad"
        @error="onImageError"
      />
      
      <!-- Overlay Gradient -->
      <view class="absolute inset-0 bg-gradient-to-b from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></view>
      
      <!-- 分类/话题角标 -->
      <view v-if="item.typeLabel || item.type" class="absolute top-2 left-2 bg-black/30 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 shadow-sm">
         <text class="text-white text-[10px] font-bold tracking-wide">{{ item.typeLabel || item.type }}</text>
      </view>
    </view>

    <!-- Content -->
    <view class="p-3 pt-2.5 flex flex-col gap-2">
      <!-- Title -->
      <text class="text-[14px] font-medium text-gray-800 leading-[1.4] line-clamp-2 tracking-tight">
        {{ item.title }}
      </text>
      <view v-if="item.tags && item.tags.length" class="flex flex-wrap gap-1 mt-1">
        <text v-for="t in item.tags.slice(0, 2)" :key="t" class="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500">#{{ t }}</text>
      </view>

      <!-- Meta Info -->
      <view class="flex items-center justify-between mt-1">
        <!-- User -->
        <view class="flex items-center gap-1.5 flex-1 min-w-0">
          <image 
            :src="item.user?.avatar || '/static/logo.png'" 
            mode="aspectFill" 
            class="w-[28px] h-[28px] rounded-full bg-gray-100 border border-gray-50 shrink-0"
          />
          <text class="text-[11px] text-gray-500 font-normal truncate">{{ item.user.name }}</text>
        </view>

        <!-- Likes -->
        <view class="flex items-center gap-1 shrink-0 group/like" @click.stop="toggleLike">
          <u-icon 
            :name="isLiked ? 'heart-fill' : 'heart'" 
            :color="isLiked ? '#FF2442' : '#94a3b8'" 
            size="16"
            class="transition-transform duration-300"
            :class="isLiked ? 'scale-110' : 'group-active/like:scale-125'"
          ></u-icon>
          <text class="text-[11px] text-gray-400 font-medium tabular-nums">{{ likeCount }}</text>
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
  user: {
    id?: number;
    name: string;
    avatar: string;
  };
  likes: number | string;
  isLiked?: boolean;
}

const props = defineProps<{
  item: MasonryItemProps;
}>();

const emit = defineEmits(['click', 'like']);

const displayImageUrl = computed(() => getDisplayImageUrl(props.item.image));

const imageLoaded = ref(false);
const isLiked = ref(props.item.isLiked || false);
const likeCount = ref(Number(props.item.likes) || 0);

watch(() => props.item, (newVal) => {
  isLiked.value = newVal.isLiked || false;
  likeCount.value = Number(newVal.likes) || 0;
}, { deep: true });

const onImageLoad = () => {
  imageLoaded.value = true;
};

const onImageError = () => {
  // Handle error if needed, maybe set a fallback image
  imageLoaded.value = true; // Stop skeleton
};

const handleClick = () => {
  emit('click', props.item);
};

const toggleLike = () => {
  isLiked.value = !isLiked.value;
  likeCount.value += isLiked.value ? 1 : -1;
  // Trigger haptic feedback if available
  // uni.vibrateShort(); 
  emit('like', { ...props.item, isLiked: isLiked.value });
};
</script>

<style scoped>
/* Smooth rendering optimization */
.masonry-item {
  /* Subtle shadow for depth without heaviness */
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.masonry-item:active {
  transform: scale(0.98);
}
</style>
