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
          :src="getDisplayImageUrl(img)"
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
      <!-- User Info Row -->
      <view class="flex items-center justify-between mb-4">
        <view class="flex items-center gap-2.5 active:opacity-80" @click="goToUserHome">
          <image
            :src="post.user?.avatar || '/static/logo.png'"
            class="w-[40px] h-[40px] rounded-full border border-gray-100 bg-gray-50 flex-shrink-0"
            mode="aspectFill"
          />
          <text class="text-sm font-bold text-gray-900">{{
            post.user?.nickname || post.user?.username
          }}</text>
        </view>
        <view
          v-if="post.user?.id"
          class="px-3 py-1 rounded-full text-xs font-medium"
          :class="isFollowingAuthor ? 'bg-gray-100 text-gray-500' : 'bg-[#FF2442] text-white'"
          @click.stop="handleFollowAuthor"
        >{{ isFollowingAuthor ? '已关注' : '关注' }}</view>
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

      <!-- 话题 / 分类 / 日期 -->
      <view class="mt-6 flex items-center justify-between flex-wrap gap-2">
        <view class="flex items-center gap-2 flex-wrap">
          <view
            v-for="tag in (post.tags || [])"
            :key="tag"
            class="px-2.5 py-1 bg-gray-50 rounded-md text-xs text-gray-500 font-medium active:opacity-80"
            @click="goSearchByTag(tag)"
          >#{{ tag }}</view>
          <view v-if="post.typeLabel" class="px-2.5 py-1 bg-[#FFF0F2] rounded-md text-xs text-[#FF2442] font-medium">
            {{ post.typeLabel }}
          </view>
        </view>
        <text class="text-xs text-gray-400 font-medium">{{ post.date }}</text>
      </view>

      <!-- 生成行程入口 -->
      <view
        class="mt-5 py-3 px-4 rounded-2xl flex items-center justify-center gap-2 bg-gradient-to-r from-[#FF2442]/10 to-[#FF899D]/10 border border-[#FF2442]/20 active:scale-[0.98] transition-transform"
        @click="handleGenerateItinerary"
      >
        <text class="text-[#FF2442] font-semibold text-sm">根据这篇帖子生成行程</text>
        <text class="text-[#FF2442] text-base">✈️</text>
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
          class="w-[24px] h-[24px] rounded-full bg-gray-100 shrink-0 border border-gray-50"
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
          <text class="text-[10px] text-gray-400">{{ formatPostDate(comment.created_at) }}</text>
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

    <!-- 生成行程弹窗：三阶段（转圈 -> 流式摘要 -> 完成结果+保存） -->
    <u-popup
      :show="showItineraryPopup"
      @close="closeItineraryPopup"
      mode="center"
      :round="16"
      :closeOnClickOverlay="!generatingItinerary"
    >
      <view class="w-[90vw] max-w-[360px] bg-white rounded-2xl p-5 shadow-xl">
        <!-- 阶段 1：生成中，无摘要 -->
        <view v-if="generatingItinerary && !streamingSummary" class="py-8 flex flex-col items-center gap-4">
          <view class="w-12 h-12 rounded-full border-4 border-[#FF2442]/30 border-t-[#FF2442] animate-spin"></view>
          <text class="text-gray-600 text-sm">正在根据帖子内容生成行程...</text>
          <text v-if="thinkingText" class="text-gray-400 text-xs text-center px-2 max-h-[60px] overflow-hidden">{{ thinkingText.slice(-80) }}</text>
        </view>

        <!-- 阶段 2：流式摘要展示 -->
        <view v-else-if="generatingItinerary && streamingSummary" class="py-4">
          <view class="flex items-center gap-2 mb-4">
            <view class="w-5 h-5 rounded-full border-2 border-[#FF2442]/30 border-t-[#FF2442] animate-spin"></view>
            <text class="text-sm font-semibold text-gray-900">正在生成行程...</text>
          </view>
          <scroll-view scroll-y class="bg-gray-50 rounded-xl p-4 max-h-[40vh]">
            <text class="text-sm text-gray-700 whitespace-pre-wrap block leading-relaxed">{{ streamingSummary }}</text>
          </scroll-view>
          <text v-if="thinkingText" class="text-gray-400 text-xs mt-3 block">💭 {{ thinkingText.slice(-60) }}</text>
        </view>

        <!-- 阶段 3：完成 -->
        <template v-else>
          <view class="flex justify-between items-center mb-4">
            <text class="text-lg font-bold text-gray-900">{{ generateError ? '生成失败' : '行程已生成' }}</text>
            <view class="p-1 bg-gray-100 rounded-full" @click="closeItineraryPopup">
              <u-icon name="close" size="18" color="#94a3b8"></u-icon>
            </view>
          </view>
          <view v-if="generateError" class="py-4">
            <text class="text-red-500 text-sm">{{ generateError }}</text>
          </view>
          <view v-else-if="generatedItineraryData">
            <scroll-view scroll-y class="max-h-[50vh]">
              <text class="text-gray-700 text-sm whitespace-pre-wrap block mb-4">{{ itineraryPreviewText }}</text>
            </scroll-view>
            <view
              class="py-3 mt-2 rounded-xl bg-[#FF2442] text-white text-center font-semibold text-sm active:opacity-90"
              @click="saveGeneratedItinerary"
            >
              保存为行程
            </view>
          </view>
          <view v-else class="py-4">
            <text class="text-gray-600 text-sm">{{ generatedContent || '未识别到行程，请重试或去聊天中生成。' }}</text>
          </view>
        </template>
      </view>
    </u-popup>

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
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getPostById, generateItineraryFromPost } from "@/api/post";
import { saveItinerary } from "@/api/itinerary";
import { getDisplayImageUrl } from "@/utils/imageProxy";
import { followUser, unfollowUser, checkFollow } from "@/api/follow";
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
const isFollowingAuthor = ref(false);
const commentsList = ref<any[]>([]);
const commentContent = ref("");
const showCommentInput = ref(false);

const showItineraryPopup = ref(false);
const generatingItinerary = ref(false);
const generatedItineraryData = ref<any>(null);
const generatedContent = ref("");
const generateError = ref("");
const chunkBuffer = ref("");
const streamingSummary = ref("");
const thinkingText = ref("");

const TYPE_LABELS: Record<string, string> = {
  recommend: "推荐",
  nearby: "附近",
  food: "美食",
  travel: "旅行",
  beauty: "彩妆",
};

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
  typeLabel: "",
});

function formatPostDate(v: any): string {
  if (v == null || v === "") return "";
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}

const displayImageUrls = computed(() =>
  (post.value.images || []).map((img: string) => getDisplayImageUrl(img))
);

const handlePreviewImage = (current: number) => {
  uni.previewImage({
    urls: displayImageUrls.value.length ? displayImageUrls.value : post.value.images,
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
        date: formatPostDate(res.created_at),
        likes: res.likesCount || 0,
        favorites: res.favoritesCount || 0,
        comments: res.commentsCount || 0,
        user: res.user,
        tags: res.tags || [],
        typeLabel: TYPE_LABELS[res.type] || res.type || "",
      };
      isLiked.value = res.isLiked;
      isFavorited.value = res.isFavorited;
      if (res.user?.id) {
        try {
          const check: any = await checkFollow(res.user.id);
          isFollowingAuthor.value = !!check?.isFollowing;
        } catch (_) {}
      }
      loadComments(id);
    }
  } catch (error) {
    console.error("Load post failed:", error);
    uni.showToast({ title: "加载失败", icon: "none" });
  }
};

const goToUserHome = () => {
  const uid = post.value.user?.id;
  if (uid) uni.navigateTo({ url: `/pages/user/home?id=${uid}` });
};

const handleFollowAuthor = async () => {
  const uid = post.value.user?.id;
  if (!uid) return;
  try {
    if (isFollowingAuthor.value) {
      await unfollowUser(uid);
      isFollowingAuthor.value = false;
      uni.showToast({ title: "已取消关注", icon: "none" });
    } else {
      await followUser(uid);
      isFollowingAuthor.value = true;
      uni.showToast({ title: "关注成功", icon: "success" });
    }
  } catch (e) {
    uni.showToast({ title: "操作失败", icon: "none" });
  }
};

const goSearchByTag = (tag: string) => {
  uni.navigateTo({ url: `/pages/search/search?tag=${encodeURIComponent(tag)}` });
};

function formatItineraryPreview(data: any): string {
  if (!data || typeof data !== "object" || !Array.isArray(data.nodes)) return "";
  const dest = data.destination || "目的地";
  const days = data.summary?.totalDays || 0;
  const total = data.summary?.totalNodes || data.nodes.length;
  const lines: string[] = [`目的地：${dest}，共 ${days} 天 ${total} 个安排`];
  const byDay: Record<number, any[]> = {};
  for (const n of data.nodes) {
    const d = n.dayIndex ?? 1;
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(n);
  }
  const daysOrder = Object.keys(byDay)
    .map(Number)
    .sort((a, b) => a - b);
  for (const d of daysOrder) {
    lines.push(`\n第 ${d} 天：`);
    for (const n of byDay[d]) {
      const time = n.timeSlot ? `${n.timeSlot} ` : "";
      lines.push(`  · ${time}${n.title || "行程节点"}`);
    }
  }
  return lines.join("\n").trim();
}

/**
 * 从 SSE chunk 累积的 buffer 里渐进提取已完整的键值对，生成可读摘要。
 * 复用自 chat.vue 的 extractStreamingSummary。
 */
function extractStreamingSummary(buffer: string): string {
  if (!buffer || typeof buffer !== "string") return "";
  const raw = buffer.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  if (!raw) return "";

  const lines: string[] = [];
  const destMatch = raw.match(/"destination"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (destMatch) lines.push(`目的地：${destMatch[1]}`);

  const startMatch = raw.match(/"startDate"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const endMatch = raw.match(/"endDate"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (startMatch || endMatch) {
    const start = startMatch ? startMatch[1] : "—";
    const end = endMatch ? endMatch[1] : "—";
    lines.push(`出行时间：${start} 至 ${end}`);
  }

  const budgetMatch = raw.match(/"budgetLevel"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (budgetMatch) {
    const level = budgetMatch[1];
    const levelText = level === "low" ? "经济" : level === "high" ? "高端" : "中等";
    lines.push(`预算：${levelText}`);
  }

  const styleMatch = raw.match(/"styleTags"\s*:\s*\[([^\]]*)\]/);
  if (styleMatch && styleMatch[1].trim()) {
    const tags = styleMatch[1].match(/"((?:[^"\\]|\\.)*)"/g);
    if (tags && tags.length) lines.push(`风格：${tags.map((t: string) => t.slice(1, -1)).join("、")}`);
  }

  const titleMatches = raw.matchAll(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g);
  const titles = [...titleMatches].map((m: RegExpMatchArray) => m[1]);
  if (titles.length) {
    lines.push("");
    lines.push("已识别景点/安排：");
    titles.forEach((t: string, i: number) => lines.push(`· ${i + 1}. ${t}`));
  }

  if (lines.length === 0) return "";
  return lines.join("\n");
}

/** 把行程数据解析成可读文案，复用自 chat.vue 的 formatItineraryReadable */
function formatItineraryReadable(data: any): string {
  if (!data || typeof data !== "object" || !Array.isArray(data.nodes)) return "";
  const dest = data.destination || "目的地";
  const start = data.startDate || "";
  const end = data.endDate || "";
  const days = data.summary?.totalDays || 0;
  const total = data.summary?.totalNodes || data.nodes.length;
  const cost = data.summary?.estimatedCost;
  const lines: string[] = [];
  lines.push("【行程概览】");
  lines.push(`目的地：${dest}`);
  if (start || end) lines.push(`出行时间：${start || "—"} 至 ${end || "—"}${days ? `（${days} 天）` : ""}`);
  lines.push(`共 ${total} 个安排${cost != null ? ` · 预估费用约 ${cost} 元` : ""}`);
  lines.push("");
  const byDay: Record<number, typeof data.nodes> = {};
  for (const n of data.nodes) {
    const d = n.dayIndex ?? 1;
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(n);
  }
  const daysOrder = Object.keys(byDay).map(Number).sort((a: number, b: number) => a - b);
  for (const d of daysOrder) {
    lines.push(`【第 ${d} 天】`);
    for (const n of byDay[d]) {
      const time = n.timeSlot ? `${n.timeSlot} ` : "";
      lines.push(`· ${time}${n.title || "行程节点"}`);
      if (n.location) lines.push(`  地点：${n.location}`);
      if (n.notes) lines.push(`  备注：${n.notes}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

const itineraryPreviewText = computed(() =>
  formatItineraryReadable(generatedItineraryData.value) || formatItineraryPreview(generatedItineraryData.value)
);

const handleGenerateItinerary = () => {
  if (!post.value?.id) return;
  generatingItinerary.value = true;
  generatedItineraryData.value = null;
  generatedContent.value = "";
  generateError.value = "";
  chunkBuffer.value = "";
  streamingSummary.value = "";
  thinkingText.value = "";
  showItineraryPopup.value = true;

  generateItineraryFromPost(
    post.value.id,
    // onChunk: 累积到 chunkBuffer，调用 extractStreamingSummary
    (chunkText) => {
      chunkBuffer.value += chunkText;
      streamingSummary.value = extractStreamingSummary(chunkBuffer.value);
    },
    // onDone: 设置最终数据，清空流式状态
    (payload) => {
      generatingItinerary.value = false;
      chunkBuffer.value = "";
      streamingSummary.value = "";
      thinkingText.value = "";
      if (payload.itineraries && payload.itineraryData) {
        generatedItineraryData.value = payload.itineraryData;
        generatedContent.value = payload.content || "";
      } else {
        generatedContent.value = payload.content || "未识别到行程。";
      }
    },
    // onContent: jsonriver 解析出的完整 content
    (content) => {
      generatedContent.value = content;
    },
    // onThinking: 累积思考过程
    (thinking) => {
      thinkingText.value += thinking;
    },
    // onError
    (err) => {
      generatingItinerary.value = false;
      chunkBuffer.value = "";
      streamingSummary.value = "";
      thinkingText.value = "";
      generateError.value = err?.message || "生成失败，请稍后重试";
    }
  );
};

const closeItineraryPopup = () => {
  if (!generatingItinerary.value) {
    showItineraryPopup.value = false;
    generatedItineraryData.value = null;
    generatedContent.value = "";
    generateError.value = "";
    chunkBuffer.value = "";
    streamingSummary.value = "";
    thinkingText.value = "";
  }
};

const saveGeneratedItinerary = async () => {
  const data = generatedItineraryData.value;
  if (!data) return;
  try {
    uni.showLoading({ title: "保存中..." });
    const content = data;
    const title = content.title || content.destination || "从帖子生成行程";
    const startDate = content.startDate || null;
    const endDate = content.endDate || null;
    const res: any = await saveItinerary({
      title,
      start_date: startDate,
      end_date: endDate,
      content,
    });
    uni.hideLoading();
    uni.showToast({ title: "已保存为行程", icon: "success" });
    closeItineraryPopup();
    if (res?.id) {
      uni.navigateTo({ url: `/pages/itinerary/detail?id=${res.id}` });
    }
  } catch (e: any) {
    uni.hideLoading();
    uni.showToast({ title: e?.message || "保存失败", icon: "none" });
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.animate-spin {
  animation: spin 0.8s linear infinite;
}
</style>
