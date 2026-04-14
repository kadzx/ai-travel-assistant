<template>
  <view class="detail-page">
    <!-- 固定毛玻璃顶栏 -->
    <view class="top-nav">
      <view class="nav-left" @click="goBack">
        <text class="back-arrow">←</text>
      </view>
      <template v-if="pageReady">
        <view class="nav-center" @click="goToUserHome">
          <image
            :src="post.user?.avatar || '/static/logo.png'"
            class="nav-avatar"
            mode="aspectFill"
          />
          <text class="nav-nickname">{{ post.user?.nickname || post.user?.username }}</text>
        </view>
        <view
          v-if="post.user?.id"
          class="follow-btn"
          :class="{ 'follow-btn--followed': isFollowingAuthor }"
          @click.stop="handleFollowAuthor"
        >
          {{ isFollowingAuthor ? '已关注' : '关注' }}
        </view>
        <view v-else class="follow-btn-placeholder"></view>
        <view class="more-btn" @click="showActionMenu">
          <text class="more-dots">···</text>
        </view>
      </template>
      <template v-else>
        <view class="nav-center">
          <view class="skeleton skeleton-circle" style="width:56rpx;height:56rpx;"></view>
          <view class="skeleton skeleton-text" style="width:120rpx;height:28rpx;"></view>
        </view>
        <view class="skeleton skeleton-btn" style="width:100rpx;height:48rpx;border-radius:999rpx;"></view>
      </template>
    </view>

    <!-- ===== 骨架屏 ===== -->
    <template v-if="!pageReady">
      <!-- 图片骨架 -->
      <view class="skeleton skeleton-image" style="width:100%;margin-top:calc(88rpx + var(--status-bar-height, 44px));"></view>

      <!-- 内容骨架卡片 -->
      <view class="content-card">
        <view class="skeleton skeleton-text" style="width:65%;height:40rpx;margin-bottom:24rpx;"></view>
        <view class="skeleton skeleton-text" style="width:100%;height:24rpx;margin-bottom:12rpx;"></view>
        <view class="skeleton skeleton-text" style="width:100%;height:24rpx;margin-bottom:12rpx;"></view>
        <view class="skeleton skeleton-text" style="width:80%;height:24rpx;margin-bottom:24rpx;"></view>
        <view style="display:flex;gap:16rpx;margin-bottom:24rpx;">
          <view class="skeleton skeleton-text" style="width:100rpx;height:44rpx;border-radius:999rpx;"></view>
          <view class="skeleton skeleton-text" style="width:80rpx;height:44rpx;border-radius:999rpx;"></view>
        </view>
        <view class="skeleton skeleton-text" style="width:40%;height:20rpx;"></view>
      </view>

      <view class="divider"></view>

      <!-- 评论骨架 -->
      <view class="comments-section">
        <view class="skeleton skeleton-text" style="width:140rpx;height:28rpx;margin-bottom:32rpx;"></view>
        <view v-for="i in 3" :key="'sk-'+i" style="display:flex;gap:20rpx;margin-bottom:40rpx;">
          <view class="skeleton skeleton-circle" style="width:64rpx;height:64rpx;"></view>
          <view style="flex:1;">
            <view class="skeleton skeleton-text" style="width:120rpx;height:22rpx;margin-bottom:12rpx;"></view>
            <view class="skeleton skeleton-text" style="width:100%;height:24rpx;margin-bottom:8rpx;"></view>
            <view class="skeleton skeleton-text" style="width:60%;height:24rpx;margin-bottom:8rpx;"></view>
            <view class="skeleton skeleton-text" style="width:100rpx;height:18rpx;"></view>
          </view>
        </view>
      </view>
    </template>

    <!-- ===== 真实内容 ===== -->
    <template v-else>
    <swiper
      class="image-swiper"
      circular
      :indicator-dots="false"
      @change="onSwiperChange"
    >
      <swiper-item v-for="(img, index) in post.images" :key="index">
        <image
          :src="getDisplayImageUrl(img)"
          mode="aspectFill"
          class="swiper-image"
          @click="handlePreviewImage(index)"
        />
      </swiper-item>
    </swiper>
    <!-- 自定义页码指示器 -->
    <view class="swiper-dots" v-if="post.images && post.images.length > 1">
      <view
        v-for="(img, index) in post.images"
        :key="'dot-' + index"
        class="swiper-dot"
        :class="{ 'swiper-dot--active': currentSwiperIndex === index }"
      ></view>
    </view>

    <!-- 内容区白色卡片 -->
    <view class="content-card">
      <!-- 标题 -->
      <text class="post-title">{{ post.title }}</text>

      <!-- 正文 -->
      <view class="post-content">
        <rich-text :nodes="post.content" />
      </view>

      <!-- 标签区 -->
      <view class="tags-row" v-if="(post.tags && post.tags.length) || post.typeLabel">
        <view
          v-for="tag in (post.tags || [])"
          :key="tag"
          class="tag-capsule"
          @click="goSearchByTag(tag)"
        >
          #{{ tag }}
        </view>
        <view v-if="post.typeLabel" class="tag-capsule">
          {{ post.typeLabel }}
        </view>
      </view>

      <!-- 地点信息 -->
      <view class="location-bar" v-if="post.location">
        <text class="location-icon">📍</text>
        <text class="location-text">{{ post.location }}</text>
      </view>

      <!-- 发布时间 -->
      <text class="post-date">{{ post.date }}</text>
    </view>

    <!-- 分割线 -->
    <view class="divider"></view>

    <!-- 评论区 -->
    <view class="comments-section">
      <text class="comments-title">共 {{ post.comments }} 条评论</text>

      <view
        class="comment-item"
        v-for="comment in commentsList"
        :key="comment.id"
      >
        <image
          :src="comment.user?.avatar || '/static/logo.png'"
          class="comment-avatar"
          mode="aspectFill"
        />
        <view class="comment-body">
          <text class="comment-username">{{ comment.user?.nickname || comment.user?.username }}</text>
          <text class="comment-content">{{ comment.content }}</text>
          <view class="comment-meta">
            <text class="comment-time">{{ formatPostDate(comment.created_at) }}</text>
            <text class="comment-reply-btn" @click="openReply(comment)">回复</text>
          </view>

          <!-- 楼中楼：子评论 -->
          <view class="replies-block" v-if="comment.replies && comment.replies.length">
            <view
              class="reply-item"
              v-for="reply in comment.replies"
              :key="reply.id"
            >
              <image
                :src="reply.user?.avatar || '/static/logo.png'"
                class="reply-avatar"
                mode="aspectFill"
              />
              <view class="reply-body">
                <view class="reply-header">
                  <text class="reply-username">{{ reply.user?.nickname || reply.user?.username }}</text>
                  <template v-if="reply.replyToUser">
                    <text class="reply-arrow">▸</text>
                    <text class="reply-target-user">{{ reply.replyToUser.nickname || reply.replyToUser.username }}</text>
                  </template>
                </view>
                <text class="reply-content">{{ reply.content }}</text>
                <view class="reply-meta">
                  <text class="reply-time">{{ formatPostDate(reply.created_at) }}</text>
                  <text class="reply-reply-btn" @click="openReply(comment, reply)">回复</text>
                </view>
              </view>
            </view>
            <!-- 查看更多回复 -->
            <view
              v-if="comment.replyCount > (comment.replies?.length || 0)"
              class="load-more-replies"
              @click="loadMoreReplies(comment)"
            >
              <text class="load-more-text">展开更多回复 ({{ comment.replyCount - (comment.replies?.length || 0) }} 条)</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="commentsList.length === 0" class="comments-empty">
        <text class="comments-empty-icon">💬</text>
        <text class="comments-empty-text">暂无评论，快来抢沙发~</text>
      </view>
    </view>
    </template>

    <!-- 底部固定操作栏 -->
    <view class="bottom-bar" v-if="pageReady">
      <!-- 第一行：互动图标 + 输入框 -->
      <view class="bar-row-1">
        <view class="bar-input" @click="showCommentInput = true">
          <text class="bar-input-text">说点什么...</text>
        </view>
        <view class="action-item" @click="handleToggleLike">
          <text class="action-emoji">{{ isLiked ? '❤️' : '🤍' }}</text>
          <text class="action-count" :class="{ 'action-count--active': isLiked }">{{ post.likes }}</text>
        </view>
        <view class="action-item" @click="handleToggleFavorite">
          <text class="action-emoji">{{ isFavorited ? '⭐' : '☆' }}</text>
          <text class="action-count" :class="{ 'action-count--active': isFavorited }">{{ post.favorites }}</text>
        </view>
        <view class="action-item">
          <text class="action-emoji">💬</text>
          <text class="action-count">{{ post.comments }}</text>
        </view>
      </view>
      <!-- 第二行：AI 生成行程 -->
      <view class="bar-row-2" @click="handleGenerateItinerary">
        <text class="gen-icon">✨</text>
        <text class="gen-text">根据这篇帖子生成行程</text>
      </view>
    </view>

    <!-- 生成行程弹窗 -->
    <u-popup
      :show="showItineraryPopup"
      @close="closeItineraryPopup"
      mode="bottom"
      :round="0"
      :closeOnClickOverlay="!generatingItinerary"
      bgColor="transparent"
    >
      <view class="itinerary-popup">
        <!-- 拖拽指示器 -->
        <view class="popup-drag-bar"></view>

        <!-- 头部 -->
        <view class="popup-header">
          <text class="popup-title">✨ AI 生成行程</text>
          <view class="popup-close" @click="closeItineraryPopup" v-if="!generatingItinerary">
            <text>✕</text>
          </view>
        </view>

        <!-- 阶段 1：加载态 -->
        <view v-if="generatingItinerary && !streamingSummary" class="popup-loading">
          <view class="loading-spinner"></view>
          <text class="loading-text">正在为你规划行程...</text>
          <text v-if="thinkingText" class="thinking-text">{{ thinkingText.slice(-80) }}</text>
        </view>

        <!-- 阶段 2：流式态 -->
        <view v-else-if="generatingItinerary && streamingSummary" class="popup-streaming">
          <view class="streaming-header">
            <view class="loading-spinner loading-spinner--small"></view>
            <text class="streaming-title">正在生成行程...</text>
          </view>
          <scroll-view scroll-y class="streaming-content">
            <text class="streaming-text">{{ streamingSummary }}</text>
          </scroll-view>
          <text v-if="thinkingText" class="thinking-text">💭 {{ thinkingText.slice(-60) }}</text>
        </view>

        <!-- 阶段 3：完成态 -->
        <template v-else>
          <view v-if="generateError" class="popup-error">
            <text class="error-text">{{ generateError }}</text>
          </view>
          <view v-else-if="generatedItineraryData" class="popup-result">
            <scroll-view scroll-y class="result-scroll">
              <text class="result-text">{{ itineraryPreviewText }}</text>
            </scroll-view>
            <view class="save-btn" @click="saveGeneratedItinerary">
              保存为行程 🎉
            </view>
          </view>
          <view v-else class="popup-fallback">
            <text class="fallback-text">{{ generatedContent || '未识别到行程，请重试或去聊天中生成。' }}</text>
          </view>
        </template>
      </view>
    </u-popup>

    <!-- 评论弹窗 -->
    <u-popup
      :show="showCommentInput"
      @close="closeCommentPopup"
      mode="bottom"
      :round="24"
      :safeAreaInsetBottom="true"
    >
      <view class="comment-popup">
        <view class="comment-popup-header">
          <text class="comment-popup-title">{{ replyTarget ? `回复 @${replyTarget.user?.nickname || replyTarget.user?.username}` : '发布评论' }}</text>
          <view class="popup-close" @click="closeCommentPopup">
            <text>✕</text>
          </view>
        </view>
        <textarea
          v-model="commentContent"
          class="comment-textarea"
          :placeholder="replyTarget ? `回复 ${replyTarget.user?.nickname || replyTarget.user?.username}...` : '写下你的想法...'"
          :show-confirm-bar="false"
          :focus="showCommentInput"
        />
        <view class="comment-popup-footer">
          <view
            class="send-btn"
            :class="{ 'send-btn--active': commentContent.trim() }"
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
  getReplies,
  submitReport,
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
const replyTarget = ref<any>(null);
const replyParentId = ref<number | null>(null);
const currentSwiperIndex = ref(0);
const pageReady = ref(false);

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

const onSwiperChange = (e: any) => {
  currentSwiperIndex.value = e.detail.current;
};

const goBack = () => {
  uni.navigateBack({ delta: 1 });
};

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
    const res: any = await getComments("post", id, { page: 1, limit: 20 });
    if (res && res.list) {
      commentsList.value = res.list;
    }
  } catch (e) {
    console.error(e);
  }
};

const openReply = (comment: any, reply?: any) => {
  replyParentId.value = comment.id;
  replyTarget.value = reply || comment;
  showCommentInput.value = true;
};

const closeCommentPopup = () => {
  showCommentInput.value = false;
  replyTarget.value = null;
  replyParentId.value = null;
};

const REPORT_REASONS = ['垃圾广告', '色情低俗', '虚假信息', '侵权内容', '其他'];

const showActionMenu = () => {
  uni.showActionSheet({
    itemList: ['举报'],
    success: (res) => {
      if (res.tapIndex === 0) showReportMenu();
    }
  });
};

const showReportMenu = () => {
  uni.showActionSheet({
    itemList: REPORT_REASONS,
    success: async (res) => {
      try {
        await submitReport({
          targetId: post.value.id,
          targetType: 'post',
          reason: REPORT_REASONS[res.tapIndex],
        });
        uni.showToast({ title: '举报已提交', icon: 'success' });
      } catch (e: any) {
        const msg = e?.message?.includes('已举报') ? '您已举报过该内容' : '举报失败';
        uni.showToast({ title: msg, icon: 'none' });
      }
    }
  });
};

const handleSendComment = async () => {
  if (!commentContent.value.trim()) return;
  try {
    const payload: any = {
      content: commentContent.value,
      targetId: post.value.id,
      targetType: "post",
    };
    if (replyParentId.value) {
      payload.parentId = replyParentId.value;
      if (replyTarget.value?.user?.id) {
        payload.replyToUserId = replyTarget.value.user.id;
      }
    }
    const res = await addComment(payload);
    if (res) {
      uni.showToast({ title: replyParentId.value ? "回复成功" : "评论成功", icon: "success" });
      commentContent.value = "";
      closeCommentPopup();
      loadComments(String(post.value.id));
      post.value.comments++;
    }
  } catch (e) {
    console.error(e);
    uni.showToast({ title: "评论失败", icon: "none" });
  }
};

const loadMoreReplies = async (comment: any) => {
  try {
    const currentCount = comment.replies?.length || 0;
    const page = Math.floor(currentCount / 10) + 1;
    const res: any = await getReplies(comment.id, { page, limit: 10 });
    if (res && res.list) {
      if (page === 1) {
        comment.replies = res.list;
      } else {
        const existingIds = new Set(comment.replies.map((r: any) => r.id));
        const newReplies = res.list.filter((r: any) => !existingIds.has(r.id));
        comment.replies = [...comment.replies, ...newReplies];
      }
    }
  } catch (e) {
    console.error(e);
  }
};

const loadPost = async (id: string) => {
  pageReady.value = false;
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
        location: res.location || "",
        latitude: res.latitude || null,
        longitude: res.longitude || null,
        address: res.address || "",
        lang: res.lang || "zh",
      };
      isLiked.value = res.isLiked;
      isFavorited.value = res.isFavorited;

      // 并行加载评论和关注状态，全部就绪后再展示
      const tasks: Promise<void>[] = [];
      tasks.push(
        getComments("post", id, { page: 1, limit: 20 }).then((cRes: any) => {
          if (cRes && cRes.list) commentsList.value = cRes.list;
        }).catch(() => {})
      );
      if (res.user?.id) {
        tasks.push(
          checkFollow(res.user.id).then((check: any) => {
            isFollowingAuthor.value = !!check?.isFollowing;
          }).catch(() => {})
        );
      }
      await Promise.all(tasks);
      pageReady.value = true;
    }
  } catch (error) {
    console.error("Load post failed:", error);
    uni.showToast({ title: "加载失败", icon: "none" });
    pageReady.value = true;
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
    (chunkText) => {
      chunkBuffer.value += chunkText;
      streamingSummary.value = extractStreamingSummary(chunkBuffer.value);
    },
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
    (content) => {
      generatedContent.value = content;
    },
    (thinking) => {
      thinkingText.value += thinking;
    },
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
/* ===== 奶油极简风格 ===== */

/* 页面容器 */
.detail-page {
  min-height: 100vh;
  background-color: #FFF8F0;
  padding-bottom: 240rpx;
}

/* ===== 固定毛玻璃顶栏 ===== */
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  height: 88rpx;
  padding-top: var(--status-bar-height, 44px);
  box-sizing: content-box;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.nav-left {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
}

.back-arrow {
  font-size: 36rpx;
  color: #3D3D3D;
  font-weight: 600;
}

.nav-center {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding-left: 16rpx;
}

.nav-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(232, 168, 124, 0.3);
  flex-shrink: 0;
}

.nav-nickname {
  font-size: 28rpx;
  font-weight: 600;
  color: #3D3D3D;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240rpx;
}

.follow-btn {
  padding: 10rpx 32rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.follow-btn--followed {
  background: #E8E8E8;
  color: #999;
}

.follow-btn-placeholder {
  width: 100rpx;
}

.more-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8rpx;
  flex-shrink: 0;
}

.more-dots {
  font-size: 28rpx;
  color: #8C8C8C;
  font-weight: 700;
  letter-spacing: 2rpx;
}

/* ===== 图片轮播 ===== */
.image-swiper {
  width: 100%;
  height: 60vh;
  background: #F5EDE4;
  margin-top: calc(88rpx + var(--status-bar-height, 44px));
}

.swiper-image {
  width: 100%;
  height: 100%;
  display: block;
}

.swiper-dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-top: -60rpx;
  position: relative;
  z-index: 5;
}

.swiper-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transition: all 0.3s ease;
}

.swiper-dot--active {
  background: #E8A87C;
  width: 24rpx;
  border-radius: 6rpx;
}

/* ===== 内容区白色卡片 ===== */
.content-card {
  position: relative;
  z-index: 10;
  margin-top: -48rpx;
  background: #fff;
  border-radius: 48rpx 48rpx 0 0;
  padding: 48rpx 40rpx 32rpx;
  box-shadow: 0 -8rpx 32rpx rgba(212, 165, 116, 0.06);
}

.post-title {
  display: block;
  font-size: 44rpx;
  font-weight: 700;
  color: #3D3D3D;
  line-height: 1.3;
  margin-bottom: 24rpx;
  letter-spacing: 0.5rpx;
}

.post-content {
  display: block;
  font-size: 28rpx;
  color: #3D3D3D;
  line-height: 1.8;
  margin-bottom: 32rpx;
  letter-spacing: 0.3rpx;
}
/* 富文本内部样式 */
.post-content :deep(h2) {
  font-size: 34rpx;
  font-weight: 700;
  color: #3D3028;
  margin: 16rpx 0 8rpx;
}
.post-content :deep(strong), .post-content :deep(b) {
  font-weight: 700;
  color: #3D3028;
}
.post-content :deep(em), .post-content :deep(i) {
  font-style: italic;
}
.post-content :deep(blockquote) {
  border-left: 6rpx solid #D4A574;
  padding: 8rpx 16rpx;
  margin: 12rpx 0;
  background: rgba(212, 165, 116, 0.06);
  color: #5D4E42;
  border-radius: 0 8rpx 8rpx 0;
}
.post-content :deep(ul), .post-content :deep(ol) {
  padding-left: 32rpx;
  margin: 8rpx 0;
}
.post-content :deep(li) {
  margin: 4rpx 0;
}
.post-content :deep(p) {
  margin: 6rpx 0;
}

/* 标签区 */
.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.tag-capsule {
  padding: 8rpx 24rpx;
  background: #FFF0E6;
  border-radius: 999rpx;
  font-size: 24rpx;
  color: #E8A87C;
  font-weight: 500;
}

/* 地点信息 */
.location-bar {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 24rpx;
  background: #F0F8F2;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.location-icon {
  font-size: 28rpx;
}

.location-text {
  font-size: 24rpx;
  color: #5A8A6A;
  font-weight: 500;
}

/* 发布时间 */
.post-date {
  display: block;
  font-size: 24rpx;
  color: #8C8C8C;
  margin-bottom: 32rpx;
}

/* AI 生成行程入口 */
.ai-entry-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-radius: 32rpx;
  background: linear-gradient(135deg, #FFF0E6, #FFE8D6, #FFF5EE);
  border: 2rpx solid rgba(232, 168, 124, 0.2);
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.98);
  }
}

.ai-entry-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.ai-icon {
  font-size: 40rpx;
}

.ai-entry-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #D4A574;
}

.ai-entry-arrow {
  font-size: 32rpx;
  color: #E8A87C;
  font-weight: 600;
}

/* ===== 分割线 ===== */
.divider {
  height: 2rpx;
  background: #F5EDE4;
  margin: 0 40rpx;
}

/* ===== 评论区 ===== */
.comments-section {
  padding: 32rpx 40rpx;
  background: #fff;
}

.comments-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #3D3D3D;
  margin-bottom: 32rpx;
}

.comment-item {
  display: flex;
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.comment-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #FFF0E6;
  flex-shrink: 0;
  border: 2rpx solid #FFF0E6;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-username {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: #8C8C8C;
  margin-bottom: 8rpx;
}

.comment-content {
  display: block;
  font-size: 28rpx;
  color: #3D3D3D;
  line-height: 1.5;
  margin-bottom: 8rpx;
}

.comment-time {
  display: block;
  font-size: 20rpx;
  color: #BFBFBF;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 4rpx;
}

.comment-reply-btn {
  font-size: 22rpx;
  color: #D4A574;
  font-weight: 500;
}

/* 楼中楼子评论 */
.replies-block {
  margin-top: 20rpx;
  padding: 20rpx 24rpx;
  background: #FFF5EE;
  border-radius: 20rpx;
}

.reply-item {
  display: flex;
  gap: 16rpx;
  margin-bottom: 20rpx;

  &:last-child {
    margin-bottom: 0;
  }
}

.reply-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #FFF0E6;
  flex-shrink: 0;
  border: 2rpx solid #FFF0E6;
}

.reply-body {
  flex: 1;
  min-width: 0;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-wrap: wrap;
  margin-bottom: 6rpx;
}

.reply-username {
  font-size: 22rpx;
  font-weight: 600;
  color: #8C8C8C;
}

.reply-arrow {
  font-size: 18rpx;
  color: #BFBFBF;
}

.reply-target-user {
  font-size: 22rpx;
  font-weight: 600;
  color: #D4A574;
}

.reply-content {
  display: block;
  font-size: 26rpx;
  color: #3D3D3D;
  line-height: 1.5;
}

.reply-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 4rpx;
}

.reply-time {
  font-size: 20rpx;
  color: #BFBFBF;
}

.reply-reply-btn {
  font-size: 20rpx;
  color: #D4A574;
  font-weight: 500;
}

.load-more-replies {
  margin-top: 16rpx;
  padding: 8rpx 0;
}

.load-more-text {
  font-size: 22rpx;
  color: #D4A574;
  font-weight: 500;
}

.comment-like {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 8rpx;
  flex-shrink: 0;
}

.comments-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 0;
  gap: 16rpx;
}

.comments-empty-icon {
  font-size: 56rpx;
  opacity: 0.4;
}

.comments-empty-text {
  font-size: 24rpx;
  color: #BFBFBF;
}

/* ===== 底部固定操作栏 ===== */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: #fff;
  box-shadow: 0 -1px 6px rgba(0, 0, 0, 0.04);
  padding: 8px 12px;
  padding-bottom: calc(12px + constant(safe-area-inset-bottom));
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  &::before {
    content: '';
    position: absolute;
    top: -20px;
    left: 0;
    right: 0;
    height: 20px;
    background: linear-gradient(to top, #fff, transparent);
    pointer-events: none;
  }
}

.bar-row-1 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.bar-input {
  flex: 1;
  background: #F5F0EB;
  border-radius: 999px;
  padding: 8px 14px;
  min-width: 0;
}
.bar-input-text {
  font-size: 13px;
  color: #BFBFBF;
}

.bar-row-2 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 11px 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  box-shadow: 0 2px 8px rgba(232, 168, 124, 0.35);
  &:active { transform: scale(0.97); opacity: 0.9; }
  transition: all 0.15s;
}
.gen-icon {
  font-size: 14px;
}
.gen-text {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.9);
  }
}

.action-emoji {
  font-size: 16px;
  line-height: 1;
}

.action-count {
  font-size: 11px;
  font-weight: 500;
  color: #8C8C8C;
}

.action-count--active {
  color: #E8A87C;
}

/* ===== 生成行程弹窗 ===== */
.itinerary-popup {
  width: 100%;
  max-height: 80vh;
  background: #FFF8F0;
  border-radius: 24px 24px 0 0;
  padding: 0 0 60rpx;
  box-sizing: border-box;
}

.popup-drag-bar {
  width: 64rpx;
  height: 8rpx;
  background: #E8D8C8;
  border-radius: 4rpx;
  margin: 20rpx auto 24rpx;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40rpx;
  padding: 0 40rpx;
}

.popup-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #3D3D3D;
}

.popup-close {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5EDE4;
  border-radius: 50%;
  font-size: 28rpx;
  color: #8C8C8C;
}

/* 加载态 */
.popup-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  padding: 48rpx 40rpx 32rpx;
}

.loading-spinner {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 6rpx solid rgba(232, 168, 124, 0.2);
  border-top-color: #E8A87C;
  animation: spin 0.8s linear infinite;
}

.loading-spinner--small {
  width: 36rpx;
  height: 36rpx;
  border-width: 4rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #8C8C8C;
}

.thinking-text {
  font-size: 22rpx;
  color: #BFBFBF;
  text-align: center;
  padding: 0 24rpx;
  max-height: 100rpx;
  overflow: hidden;
}

/* 流式态 */
.popup-streaming {
  padding: 16rpx 40rpx;
}

.streaming-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.streaming-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #3D3D3D;
}

.streaming-content {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  max-height: 40vh;
  border: 1px solid #F0EBE5;
  overflow-y: auto;
  overflow-x: hidden;
  margin: 0 auto;
  width: calc(100% - 4px);
  box-sizing: border-box;
}

.streaming-text {
  display: block;
  font-size: 26rpx;
  color: #3D3D3D;
  white-space: pre-wrap;
  line-height: 1.7;
}

/* 完成态 */
.popup-error {
  padding: 40rpx 40rpx;
}

.error-text {
  font-size: 28rpx;
  color: #E87C7C;
}

.popup-result {
  padding: 0 40rpx;
}

.result-scroll {
  max-height: 50vh;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  border: 2rpx solid #FFF0E6;
}

.result-text {
  display: block;
  font-size: 26rpx;
  color: #3D3D3D;
  white-space: pre-wrap;
  line-height: 1.6;
}

.save-btn {
  padding: 28rpx 0;
  border-radius: 999rpx;
  text-align: center;
  font-size: 30rpx;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  box-shadow: 0 8rpx 24rpx rgba(232, 168, 124, 0.3);
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.98);
  }
}

.popup-fallback {
  padding: 40rpx 0;
}

.fallback-text {
  font-size: 28rpx;
  color: #8C8C8C;
}

/* ===== 评论弹窗 ===== */
.comment-popup {
  padding: 40rpx;
  background: #FFF8F0;
}

.comment-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}

.comment-popup-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #3D3D3D;
}

.comment-textarea {
  width: 100%;
  background: #fff;
  padding: 24rpx;
  border-radius: 24rpx;
  font-size: 28rpx;
  min-height: 200rpx;
  margin-bottom: 24rpx;
  border: 2rpx solid #FFF0E6;
  box-sizing: border-box;
  color: #3D3D3D;
}

.comment-popup-footer {
  display: flex;
  justify-content: flex-end;
}

.send-btn {
  padding: 16rpx 48rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  font-weight: 700;
  background: #F5EDE4;
  color: #BFBFBF;
  transition: all 0.3s ease;
}

.send-btn--active {
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  color: #fff;
  box-shadow: 0 4rpx 16rpx rgba(232, 168, 124, 0.3);
}

/* ===== 动画 ===== */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== 骨架屏 ===== */
@keyframes skeleton-pulse {
  0% { opacity: 0.4; }
  50% { opacity: 0.8; }
  100% { opacity: 0.4; }
}

.skeleton {
  background: linear-gradient(135deg, #F5EDE4, #FFF0E6, #F5EDE4);
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  border-radius: 12rpx;
}

.skeleton-circle {
  border-radius: 50%;
}

.skeleton-text {
  height: 24rpx;
}

.skeleton-btn {
  height: 48rpx;
}

.skeleton-image {
  height: 60vh;
  border-radius: 0;
}
</style>
