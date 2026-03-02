<template>
  <view class="container min-h-screen bg-white pb-[100px]">
    <!-- Custom Navigation Bar Placeholder (if needed for transparent effect) -->
    <!-- For now we rely on default nav or simple back -->

    <!-- Image Swiper -->
    <swiper
      class="w-full h-[60vh] bg-gray-50"
      circular
      :indicator-dots="true"
      indicator-active-color="#FF2442"
      indicator-color="rgba(255, 255, 255, 0.6)"
    >
      <swiper-item v-for="(img, index) in post.images" :key="index">
        <image
          :src="img"
          mode="aspectFill"
          class="w-full h-full block"
          @click="handlePreviewImage(index)"
        />
        <!-- Gradient overlay for bottom protection -->
        <view
          class="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"
        ></view>
      </swiper-item>
    </swiper>

    <!-- Content Area -->
    <view
      class="px-5 pt-5 pb-4 -mt-6 relative bg-white rounded-t-3xl z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.02)]"
    >
      <!-- User Info Row (Moved up for better context) -->
      <view class="flex items-center justify-between mb-4">
        <view class="flex items-center gap-2.5">
          <image
            :src="post.user?.avatar || '/static/logo.png'"
            class="w-9 h-9 rounded-full border border-gray-100 bg-gray-50"
          />
          <text class="text-sm font-bold text-gray-900">{{
            post.user?.nickname || post.user?.username
          }}</text>
        </view>
        <view
          class="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500 font-medium"
          >关注</view
        >
      </view>

      <!-- Title -->
      <text
        class="text-xl font-extrabold text-gray-900 leading-[1.3] block mb-3 tracking-tight"
      >
        {{ post.title }}
      </text>

      <!-- Content -->
      <text
        class="text-[15px] text-gray-600 leading-relaxed block whitespace-pre-wrap tracking-wide"
      >
        {{ post.content }}
      </text>

      <!-- Tags / Date -->
      <view class="mt-6 flex items-center justify-between">
        <view class="flex items-center gap-2">
          <view
            class="px-2.5 py-1 bg-gray-50 rounded-md text-xs text-gray-500 font-medium"
            >#京都</view
          >
          <view
            class="px-2.5 py-1 bg-gray-50 rounded-md text-xs text-gray-500 font-medium"
            >#摄影</view
          >
        </view>
        <text class="text-xs text-gray-400 font-medium">{{ post.date }}</text>
      </view>
    </view>

    <view class="h-[1px] bg-gray-100 mx-5 my-2"></view>

    <!-- Comments Section -->
    <view class="px-5 pt-2">
      <text class="text-sm font-bold text-gray-900 mb-5 block"
        >共 {{ post.comments }} 条评论</text
      >

      <view
        class="flex gap-3 mb-6"
        v-for="(comment, index) in commentsList"
        :key="index"
      >
        <image
          :src="comment.user?.avatar || '/static/logo.png'"
          class="w-8 h-8 rounded-full bg-gray-100 shrink-0 border border-gray-50"
        />
        <view class="flex-1">
          <view class="flex items-center gap-2 mb-1">
            <text class="text-xs font-bold text-gray-600">{{
              comment.user?.nickname || comment.user?.username
            }}</text>
            <!-- <text class="text-[10px] text-gray-300">2小时前</text> -->
          </view>
          <text class="text-[13px] text-gray-800 leading-normal block mb-1">
            {{ comment.content }}
          </text>
          <text class="text-[10px] text-gray-400">{{
            new Date(comment.created_at).toLocaleDateString()
          }}</text>
        </view>
        <view class="flex flex-col items-center gap-0.5 pt-1">
          <u-icon name="heart" size="14" color="#cbd5e1"></u-icon>
        </view>
      </view>

      <view
        v-if="commentsList.length === 0"
        class="flex flex-col items-center justify-center py-10 text-gray-300 gap-2"
      >
        <u-icon name="chat" size="32" color="#e2e8f0"></u-icon>
        <text class="text-xs">暂无评论，快来抢沙发~</text>
      </view>
    </view>

    <!-- Bottom Action Bar -->
    <view
      class="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-100/50 px-5 py-2 pb-safe flex items-center justify-between z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
    >
      <!-- Input Placeholder -->
      <view
        class="flex-1 bg-gray-100/80 hover:bg-gray-100 transition-colors rounded-full px-4 py-2.5 mr-6 flex items-center text-gray-400 text-sm"
        @click="showCommentInput = true"
      >
        <u-icon name="edit-pen" size="16" color="#94a3b8" class="mr-2"></u-icon>
        <text>说点什么...</text>
      </view>

      <!-- Actions -->
      <view class="flex items-center gap-6">
        <view
          class="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
          @click="handleToggleLike"
        >
          <u-icon
            :name="isLiked ? 'heart-fill' : 'heart'"
            :color="isLiked ? '#FF2442' : '#333'"
            size="26"
          ></u-icon>
          <text
            class="text-[10px] font-medium"
            :class="isLiked ? 'text-[#FF2442]' : 'text-gray-900'"
            >{{ post.likes }}</text
          >
        </view>
        <view
          class="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
          @click="handleToggleFavorite"
        >
          <u-icon
            :name="isFavorited ? 'star-fill' : 'star'"
            :color="isFavorited ? '#FF2442' : '#333'"
            size="26"
          ></u-icon>
          <text
            class="text-[10px] font-medium"
            :class="isFavorited ? 'text-[#FF2442]' : 'text-gray-900'"
            >{{ post.favorites }}</text
          >
        </view>
        <view
          class="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
        >
          <u-icon name="chat" color="#333" size="26"></u-icon>
          <text class="text-[10px] font-medium text-gray-900">{{
            post.comments
          }}</text>
        </view>
      </view>
    </view>

    <!-- Comment Popup -->
    <u-popup
      :show="showCommentInput"
      @close="showCommentInput = false"
      mode="bottom"
      :round="16"
      :safeAreaInsetBottom="true"
    >
      <view class="p-5 bg-white">
        <view class="flex justify-between items-center mb-4">
          <text class="text-[15px] font-bold text-gray-900">发布评论</text>
          <view
            class="p-1 bg-gray-50 rounded-full"
            @click="showCommentInput = false"
          >
            <u-icon name="close" size="18" color="#94a3b8"></u-icon>
          </view>
        </view>
        <textarea
          v-model="commentContent"
          class="w-full bg-gray-50 p-3 rounded-xl text-[15px] min-h-[120px] mb-4"
          placeholder="写下你的想法..."
          :show-confirm-bar="false"
          :focus="showCommentInput"
        />
        <view class="flex justify-end">
          <view
            class="px-6 py-2 rounded-full text-sm font-bold transition-all"
            :class="
              commentContent.trim()
                ? 'bg-[#FF2442] text-white shadow-lg shadow-red-200'
                : 'bg-gray-100 text-gray-400'
            "
            @click="handleSendComment"
          >
            发送
          </view>
        </view>
      </view>
    </u-popup>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getPostById } from "@/api/post";
import {
  toggleLike as apiToggleLike,
  toggleFavorite as apiToggleFavorite,
  getComments,
  addComment,
} from "@/api/social";
// @ts-ignore
import UIcon from "uview-plus/components/u-icon/u-icon.vue";
// @ts-ignore
import UPopup from "uview-plus/components/u-popup/u-popup.vue";

const isLiked = ref(false);
const isFavorited = ref(false);
const commentsList = ref<any[]>([]);
const commentContent = ref("");
const showCommentInput = ref(false);

const post = ref<any>({
  id: 0,
  title: "",
  content: "",
  images: [],
  date: "",
  likes: 0,
  favorites: 0,
  comments: 0,
  user: {},
});

const handlePreviewImage = (current: number) => {
  uni.previewImage({
    urls: post.value.images,
    current,
  });
};

const handleToggleLike = async () => {
  try {
    const res: any = await apiToggleLike({
      targetId: post.value.id,
      targetType: "post",
    });
    isLiked.value = res.liked;
    if (isLiked.value) {
      post.value.likes++;
      uni.vibrateShort({});
    } else {
      post.value.likes--;
    }
    // Emit event to update list in other pages
    uni.$emit("postUpdate", {
      id: post.value.id,
      type: "like",
      value: isLiked.value,
      count: post.value.likes,
    });
  } catch (e) {
    console.error(e);
  }
};

const handleToggleFavorite = async () => {
  try {
    const res: any = await apiToggleFavorite({
      targetId: post.value.id,
      targetType: "post",
    });
    isFavorited.value = res.favorited;
    if (isFavorited.value) {
      post.value.favorites++;
      uni.showToast({ title: "已收藏", icon: "success" });
    } else {
      post.value.favorites--;
      uni.showToast({ title: "取消收藏", icon: "none" });
    }
    // Emit event to update list in other pages (optional for favorites, but good practice)
    uni.$emit("postUpdate", {
      id: post.value.id,
      type: "favorite",
      value: isFavorited.value,
      count: post.value.favorites,
    });
  } catch (e) {
    console.error(e);
  }
};

const loadComments = async (id: string) => {
  try {
    const res: any = await getComments("post", id, { page: 1, limit: 10 });
    if (res && res.list) {
      commentsList.value = res.list;
    }
  } catch (e) {
    console.error(e);
  }
};

const handleSendComment = async () => {
  if (!commentContent.value.trim()) return;
  try {
    const res = await addComment({
      content: commentContent.value,
      targetId: post.value.id,
      targetType: "post",
    });
    if (res) {
      uni.showToast({ title: "评论成功", icon: "success" });
      commentContent.value = "";
      showCommentInput.value = false;
      // Reload comments and count
      loadComments(String(post.value.id));
      post.value.comments++;
    }
  } catch (e) {
    console.error(e);
    uni.showToast({ title: "评论失败", icon: "none" });
  }
};

const loadPost = async (id: string) => {
  try {
    const res: any = await getPostById(id);
    if (res) {
      post.value = {
        id: res.id,
        title: res.title,
        content: res.content,
        images:
          res.images && res.images.length
            ? res.images
            : ["https://via.placeholder.com/800x800"],
        date: new Date(res.created_at).toLocaleDateString(),
        likes: res.likesCount || 0,
        favorites: res.favoritesCount || 0,
        comments: res.commentsCount || 0,
        user: res.user,
      };
      isLiked.value = res.isLiked;
      isFavorited.value = res.isFavorited;

      loadComments(id);
    }
  } catch (error) {
    console.error("Load post failed:", error);
    uni.showToast({ title: "加载失败", icon: "none" });
  }
};

onLoad((options) => {
  if (options && options.id) {
    loadPost(options.id);
  }
});
</script>

<style lang="scss" scoped>
.pb-safe {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
