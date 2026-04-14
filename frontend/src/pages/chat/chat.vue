<template>
  <view class="chat-page">
    <!-- 顶栏：毛玻璃效果 -->
    <view class="top-bar">
      <view class="top-bar-inner">
        <view style="width: 32px;"></view>
        <text class="top-title">{{ t('chat.title') }}</text>
        <view class="online-dot"></view>
      </view>
    </view>

    <!-- 聊天区域 -->
    <scroll-view
      scroll-y
      class="chat-scroll"
      :scroll-into-view="scrollTarget"
      :scroll-with-animation="true"
    >
      <!-- 空状态 -->
      <view v-if="messages.length === 0" class="empty-state">
        <!-- AI 头像 -->
        <view class="empty-avatar">
          <text class="empty-avatar-icon">✨</text>
        </view>
        <!-- 欢迎气泡 -->
        <view class="welcome-bubble">
          <text class="welcome-text">{{ t('chat.welcome') }}</text>
        </view>
        <!-- 快捷提示词卡片 2x2 -->
        <view class="prompt-grid">
          <view class="prompt-card prompt-card-pink" @click="sendMessage(t('chat.prompt1'))">
            <text class="prompt-emoji">🗼</text>
            <text class="prompt-text">{{ t('chat.prompt1') }}</text>
          </view>
          <view class="prompt-card prompt-card-blue" @click="sendMessage(t('chat.prompt2'))">
            <text class="prompt-emoji">🏖</text>
            <text class="prompt-text">{{ t('chat.prompt2') }}</text>
          </view>
          <view class="prompt-card prompt-card-green" @click="sendMessage(t('chat.prompt3'))">
            <text class="prompt-emoji">🎒</text>
            <text class="prompt-text">{{ t('chat.prompt3') }}</text>
          </view>
          <view class="prompt-card prompt-card-yellow" @click="sendMessage(t('chat.prompt4'))">
            <text class="prompt-emoji">🍜</text>
            <text class="prompt-text">{{ t('chat.prompt4') }}</text>
          </view>
        </view>
      </view>

      <!-- 消息列表 -->
      <view class="msg-list">
        <view
          v-for="(msg, index) in messages"
          :key="index"
          :id="'msg-' + index"
          class="msg-row"
          :class="msg.role === 'user' ? 'msg-row-user' : 'msg-row-ai'"
        >
          <view class="msg-flex" :class="msg.role === 'user' ? 'msg-flex-reverse' : ''">
            <!-- 头像 -->
            <view class="msg-avatar" :class="msg.role === 'user' ? 'msg-avatar-user' : 'msg-avatar-ai'">
              <image v-if="msg.role === 'user'" :src="userAvatar" mode="aspectFill" class="avatar-img" />
              <text v-else class="avatar-ai-icon">✨</text>
            </view>
            <!-- 右侧内容 -->
            <view class="msg-body">
              <!-- 思考过程折叠卡片 -->
              <view
                v-if="msg.role === 'assistant' && (msg.thinking || msg.streamingSummary || formatItineraryReadable(msg.itineraryData) || msg.isLoading)"
                class="thinking-card"
              >
                <view class="thinking-header" @click="toggleThinking(index)">
                  <view class="thinking-title-row">
                    <text class="thinking-icon">🧠</text>
                    <text class="thinking-title">{{ collapsibleTitle(msg) }}</text>
                  </view>
                  <text class="thinking-toggle">{{ msg.thinkingExpanded ? t('chat.collapse') : t('chat.expand') }}</text>
                </view>
                <view v-show="msg.thinkingExpanded" class="thinking-body">
                  <text v-if="msg.thinking" class="thinking-text">{{ msg.thinking }}</text>
                  <text v-if="msg.streamingSummary" class="thinking-text mt-2">{{ msg.streamingSummary }}</text>
                  <text v-if="formatItineraryReadable(msg.itineraryData)" class="thinking-text mt-2">{{ formatItineraryReadable(msg.itineraryData) }}</text>
                  <text v-if="msg.isLoading && !msg.thinking && !msg.streamingSummary && !formatItineraryReadable(msg.itineraryData)" class="thinking-text thinking-loading">{{ t('chat.thinking') }}</text>
                </view>
              </view>

              <!-- 消息气泡 -->
              <view class="bubble" :class="msg.role === 'user' ? 'bubble-user' : 'bubble-ai'">
                <text :user-select="true" class="bubble-text" :class="msg.role === 'user' ? 'bubble-text-user' : 'bubble-text-ai'">{{ bubbleDisplayContent(msg) }}</text>
                <!-- 打字指示器 -->
                <view v-if="msg.isLoading" class="typing-dots">
                  <view class="dot dot1"></view>
                  <view class="dot dot2"></view>
                  <view class="dot dot3"></view>
                </view>
              </view>

              <!-- 行程卡片 -->
              <view v-if="msg.role === 'assistant' && msg.itineraryData && !msg.isLoading" class="itinerary-card">
                <view class="itinerary-left-line"></view>
                <view class="itinerary-content">
                  <view class="itinerary-header">
                    <text class="itinerary-icon">🗺</text>
                    <text class="itinerary-title">{{ msg.itineraryData.title || msg.itineraryData.destination || t('chat.itineraryDefault') }}</text>
                  </view>
                  <view v-if="msg.itineraryData.summary?.totalDays" class="itinerary-tag">
                    <text class="itinerary-tag-text">{{ msg.itineraryData.summary.totalDays }}{{ t('chat.dayTrip') }}</text>
                  </view>
                  <view class="itinerary-actions">
                    <view class="itinerary-btn-detail" @click="saveItineraryFromMessage(msg)">
                      <text class="itinerary-btn-text">{{ t('chat.viewDetail') }}</text>
                    </view>
                    <view class="itinerary-btn-save" @click="saveItineraryFromMessage(msg)">
                      <text class="itinerary-btn-save-text">{{ t('chat.saveItinerary') }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view id="scroll-bottom" class="scroll-anchor"></view>
    </scroll-view>

    <!-- 自定义 TabBar -->
    <custom-tabbar current="/pages/chat/chat" />

    <!-- 底部输入栏 -->
    <view class="input-bar">
      <view class="input-wrapper">
        <textarea
          v-model="inputContent"
          class="input-field"
          :placeholder="t('chat.placeholder')"
          placeholder-class="input-placeholder"
          :auto-height="true"
          :show-confirm-bar="false"
          cursor-spacing="20"
        ></textarea>
        <view
          class="send-btn"
          :class="isValid ? 'send-btn-active' : 'send-btn-inactive'"
          @click="handleSend"
        >
          <text class="send-arrow">↑</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/user';
import { startSession, sendMessageStream, getHistory } from '@/api/chat';
import { saveItinerary } from '@/api/itinerary';
// @ts-ignore
import UIcon from 'uview-plus/components/u-icon/u-icon.vue';

const { t } = useI18n();
const userStore = useUserStore();
const inputContent = ref('');
const scrollTarget = ref('');
const isSending = ref(false);
const sessionId = ref('');

const userAvatar = computed(() => userStore.userInfo?.avatar || '/static/logo.png');

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  /** 工作流原始返回 JSON 字符串，在可折叠区展示 */
  rawWorkflowJson?: string;
  thinkingExpanded?: boolean;
  isLoading?: boolean;
  itineraryData?: any;
  /** 流式阶段累积的 chunk 原始串，用于从中提取可读信息 */
  chunkBuffer?: string;
  /** 从 chunk 中渐进解析出的可读摘要，展示在「思考过程」里 */
  streamingSummary?: string;
}

const messages = ref<Message[]>([]);

const quickPrompts = [
  '帮我规划一个京都3天行程 🍁',
  '东京有哪些必去的小众景点？📸',
  '大阪美食推荐 🍜',
  '适合情侣的日本温泉酒店 ♨️'
];

const isValid = computed(() => inputContent.value.trim().length > 0);

const scrollToBottom = () => {
  nextTick(() => {
    scrollTarget.value = 'scroll-bottom';
    setTimeout(() => { scrollTarget.value = '' }, 100);
  });
};

const initSession = async () => {
  try {
    const res: any = await startSession();
    if (res && res.sessionId) {
      sessionId.value = res.sessionId;
    }
  } catch (e: any) {
    console.error('Init session failed', e);
    const msg = (e?.errMsg || e?.message || '').toString();
    if (msg.includes('fail') || msg.includes('refused') || msg.includes('network')) {
      uni.showToast({ title: t('chat.serverError'), icon: 'none', duration: 3000 });
    }
  }
};

const sendMessage = (text: string) => {
  if (!text.trim() || isSending.value) return;
  if (!sessionId.value) {
    initSession().then(() => doSendMessage(text));
  } else {
    doSendMessage(text);
  }
};

const doSendMessage = (text: string) => {
  if (!sessionId.value) return;
  messages.value.push({ role: 'user', content: text });
  inputContent.value = '';
  scrollToBottom();
  isSending.value = true;
  messages.value.push({ role: 'assistant', content: '', thinking: '', thinkingExpanded: true, isLoading: true, chunkBuffer: '', streamingSummary: '' });
  scrollToBottom();

  const lastIdx = messages.value.length - 1;

  const onContent = (content: string) => {
    const msg = messages.value[lastIdx];
    if (msg && msg.role === 'assistant') {
      msg.content = content;
    }
    scrollToBottom();
  };

  const onThinking = (thinkingText: string) => {
    const msg = messages.value[lastIdx];
    if (msg && msg.role === 'assistant') {
      msg.thinking = (msg.thinking || '') + thinkingText;
    }
    scrollToBottom();
  };

  sendMessageStream(
    { sessionId: sessionId.value, content: text },
    (chunkText: string) => {
      const msg = messages.value[lastIdx];
      if (msg && msg.role === 'assistant') {
        msg.content += chunkText;
        msg.chunkBuffer = (msg.chunkBuffer || '') + chunkText;
        msg.streamingSummary = extractStreamingSummary(msg.chunkBuffer);
      }
      scrollToBottom();
    },
    (payload) => {
      const msg = messages.value[lastIdx];
      if (msg && msg.role === 'assistant') {
        msg.isLoading = false;
        msg.content = payload.content ?? msg.content;
        if (payload.thinking != null) msg.thinking = payload.thinking;
        if (payload.rawOutput != null) msg.rawWorkflowJson = payload.rawOutput;
        if (payload.itineraries && payload.itineraryData) {
          msg.itineraryData = payload.itineraryData;
        }
        msg.streamingSummary = '';
        msg.chunkBuffer = '';
      }
      isSending.value = false;
      scrollToBottom();
    },
    onContent,
    onThinking,
    (err) => {
      const msg = messages.value[lastIdx];
      if (msg && msg.role === 'assistant') {
        msg.isLoading = false;
        msg.content = err?.message || t('chat.networkError');
      }
      isSending.value = false;
      scrollToBottom();
      uni.showToast({ title: err?.message || t('chat.requestFail'), icon: 'none' });
    }
  );
};

const toggleThinking = (index: number) => {
  const msg = messages.value[index];
  if (msg) msg.thinkingExpanded = !msg.thinkingExpanded;
};

/**
 * 从 SSE chunk 累积的 buffer 里渐进提取已完整的键值对，生成可读摘要，用于「思考过程」流式展示。
 * 只展示正则能完整匹配到的字段，避免半截内容。
 */
const extractStreamingSummary = (buffer: string): string => {
  if (!buffer || typeof buffer !== 'string') return '';
  const raw = buffer.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  if (!raw) return '';

  const lines: string[] = [];
  const destMatch = raw.match(/"destination"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (destMatch) lines.push(`${t('chat.destination')}：${destMatch[1]}`);

  const startMatch = raw.match(/"startDate"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const endMatch = raw.match(/"endDate"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (startMatch || endMatch) {
    const start = startMatch ? startMatch[1] : '—';
    const end = endMatch ? endMatch[1] : '—';
    lines.push(`${t('chat.travelTime')}：${start} ${t('chat.to')} ${end}`);
  }

  const budgetMatch = raw.match(/"budgetLevel"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (budgetMatch) {
    const level = budgetMatch[1];
    const levelText = level === 'low' ? t('chat.budgetLow') : level === 'high' ? t('chat.budgetHigh') : t('chat.budgetMid');
    lines.push(`${t('chat.budget')}：${levelText}`);
  }

  const styleMatch = raw.match(/"styleTags"\s*:\s*\[([^\]]*)\]/);
  if (styleMatch && styleMatch[1].trim()) {
    const tags = styleMatch[1].match(/"((?:[^"\\]|\\.)*)"/g);
    if (tags && tags.length) lines.push(`${t('chat.style')}：${tags.map(s => s.slice(1, -1)).join('、')}`);
  }

  const titleMatches = raw.matchAll(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g);
  const titles = [...titleMatches].map(m => m[1]);
  if (titles.length) {
    lines.push('');
    lines.push(`${t('chat.identifiedSpots')}：`);
    titles.forEach((ti, i) => lines.push(`· ${i + 1}. ${ti}`));
  }

  if (lines.length === 0) return '';
  return lines.join('\n');
};

/** 把行程数据解析成普通人能看懂的文案，不展示 JSON */
const formatItineraryReadable = (data: any): string => {
  if (!data || typeof data !== 'object' || !Array.isArray(data.nodes)) return '';
  const dest = data.destination || t('chat.destination');
  const start = data.startDate || '';
  const end = data.endDate || '';
  const dayCount = data.summary?.totalDays || 0;
  const total = data.summary?.totalNodes || data.nodes.length;
  const cost = data.summary?.estimatedCost;
  const lines: string[] = [];
  lines.push(t('chat.overviewTitle'));
  lines.push(`${t('chat.destination')}：${dest}`);
  if (start || end) lines.push(`${t('chat.travelTime')}：${start || '—'} ${t('chat.to')} ${end || '—'}${dayCount ? `（${dayCount}${t('chat.days')}）` : ''}`);
  const costStr = cost != null ? ` · ${t('chat.estimatedCost')} ${cost} ${t('chat.yuan')}` : '';
  lines.push(`${total}${t('chat.totalArrangements')}${costStr}`);
  lines.push('');
  const byDay: Record<number, typeof data.nodes> = {};
  for (const n of data.nodes) {
    const d = n.dayIndex ?? 1;
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(n);
  }
  const daysOrder = Object.keys(byDay).map(Number).sort((a, b) => a - b);
  for (const d of daysOrder) {
    lines.push(t('chat.dayLabel', { n: d }));
    for (const n of byDay[d]) {
      const time = n.timeSlot ? `${n.timeSlot} ` : '';
      lines.push(`· ${time}${n.title || t('chat.itineraryDefault')}`);
      if (n.location) lines.push(`  ${t('chat.spot')}：${n.location}`);
      if (n.notes) lines.push(`  ${t('chat.remark')}：${n.notes}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
};

const collapsibleTitle = (msg: Message): string => {
  if (msg.thinking && formatItineraryReadable(msg.itineraryData)) return t('chat.thinkingAndDetail');
  if (msg.streamingSummary && msg.isLoading) return t('chat.generating');
  if (formatItineraryReadable(msg.itineraryData)) return t('chat.itineraryDetail');
  return t('chat.thinkingProcess');
};

/** 主气泡展示文案：流式阶段若收到的是 JSON 片段，不直接展示，改为友好提示 */
const bubbleDisplayContent = (msg: Message): string => {
  if (msg.role !== 'assistant') return msg.content;
  const raw = (msg.content || '').trim();
  const looksLikeJson = raw.startsWith('{') || raw.startsWith('```');
  if (msg.isLoading && looksLikeJson) return t('chat.generatingItinerary');
  return msg.content || '';
};

const saveItineraryFromMessage = async (msg: Message) => {
  if (!msg.itineraryData) return;
  try {
    uni.showLoading({ title: t('chat.saving') });
    const content = msg.itineraryData;
    const title = content.title || content.destination || t('chat.aiGenerated');
    const startDate = content.startDate || null;
    const endDate = content.endDate || null;
    const res: any = await saveItinerary({
      title,
      start_date: startDate,
      end_date: endDate,
      content
    });
    uni.hideLoading();
    uni.showToast({ title: t('chat.saved'), icon: 'success' });
    if (res?.id) {
      uni.navigateTo({ url: `/pages/itinerary/detail?id=${res.id}` });
    }
  } catch (e: any) {
    uni.hideLoading();
    uni.showToast({ title: e?.message || t('chat.saveFailed'), icon: 'none' });
  }
};

const handleSend = () => {
  sendMessage(inputContent.value);
};

onMounted(() => {
  if (userStore.token) userStore.getUserInfo();
  initSession();
});
</script>

<style lang="scss" scoped>
/* ===== 全局 ===== */
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #FFF8F0;
}

/* ===== 顶栏：毛玻璃 ===== */
.top-bar {
  flex-shrink: 0;
  z-index: 50;
  padding-top: var(--status-bar-height, 44px);
  background: rgba(255, 248, 240, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
}
.top-bar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 12px 16px;
}
.back-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.04);
}
.back-arrow {
  font-size: 22px;
  color: #666;
  line-height: 1;
  margin-top: -2px;
}
.top-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
  letter-spacing: 0.5px;
}
.online-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #4CAF50;
  box-shadow: 0 0 6px rgba(76, 175, 80, 0.5);
}

/* ===== 聊天滚动区 ===== */
.chat-scroll {
  flex: 1;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto;
  min-height: 0;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 60px;
  animation: fadeInUp 0.6s ease-out forwards;
  opacity: 0;
}
.empty-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #95B8A3;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(149, 184, 163, 0.3);
}
.empty-avatar-icon {
  font-size: 28px;
}
.welcome-bubble {
  background: #fff;
  border-radius: 0 20px 20px 20px;
  padding: 14px 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  max-width: 280px;
}
.welcome-text {
  font-size: 15px;
  color: #555;
  line-height: 1.6;
}

/* ===== 快捷提示词 2x2 网格 ===== */
.prompt-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
  max-width: 340px;
}
.prompt-card {
  border-radius: 16px;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.15s ease;
  &:active {
    transform: scale(0.96);
  }
}
.prompt-card-pink { background-color: #FFF0E6; }
.prompt-card-blue { background-color: #EDF4FA; }
.prompt-card-green { background-color: #F0F8F2; }
.prompt-card-yellow { background-color: #FFF8E6; }
.prompt-emoji {
  font-size: 24px;
}
.prompt-text {
  font-size: 13px;
  color: #555;
  line-height: 1.4;
}

/* ===== 消息列表 ===== */
.msg-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 16px;
}
.msg-row {
  display: flex;
  flex-direction: column;
  width: 100%;
}
.msg-row-user { align-items: flex-end; }
.msg-row-ai { align-items: flex-start; }
.msg-flex {
  display: flex;
  flex-direction: row;
  max-width: 85%;
}
.msg-flex-reverse {
  flex-direction: row-reverse;
}

/* ===== 头像 ===== */
.msg-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.msg-avatar-user {
  margin-left: 10px;
  background: #EEE;
}
.msg-avatar-ai {
  margin-right: 10px;
  background-color: #95B8A3;
}
.avatar-img {
  width: 100%;
  height: 100%;
}
.avatar-ai-icon {
  font-size: 16px;
}

/* ===== 消息体 ===== */
.msg-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

/* ===== 思考折叠卡片 ===== */
.thinking-card {
  border-radius: 14px;
  background: #F5F3EF;
  overflow: hidden;
}
.thinking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
}
.thinking-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.thinking-icon {
  font-size: 14px;
}
.thinking-title {
  font-size: 12px;
  color: #888;
  font-weight: 500;
}
.thinking-toggle {
  font-size: 11px;
  color: #aaa;
}
.thinking-body {
  margin: 0 14px 12px;
  padding: 8px 0 8px 12px;
  border-left: 3px solid #E8A87C;
  border-radius: 0;
  overflow: hidden;
}
.thinking-text {
  font-size: 12px;
  color: #8C8C8C;
  white-space: pre-wrap;
  display: block;
  line-height: 1.7;
  word-break: break-all;
}
.thinking-loading {
  color: #aaa;
}
.mt-2 {
  margin-top: 8px;
}

/* ===== 气泡 ===== */
.bubble {
  padding: 14px 18px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.bubble-user {
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  border-radius: 20px 0 20px 20px;
}
.bubble-ai {
  background: #FFFFFF;
  border-radius: 0 20px 20px 20px;
}
.bubble-text {
  font-size: 15px;
  line-height: 1.6;
}
.bubble-text-user {
  color: #FFFFFF;
}
.bubble-text-ai {
  color: #444;
}

/* ===== 打字指示器 ===== */
.typing-dots {
  display: flex;
  gap: 5px;
  padding-top: 6px;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #C4B8A8;
  animation: dotBounce 1.2s infinite ease-in-out;
}
.dot2 { animation-delay: 0.15s; }
.dot3 { animation-delay: 0.3s; }

@keyframes dotBounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40% { transform: translateY(-6px); opacity: 1; }
}

/* ===== 行程卡片 ===== */
.itinerary-card {
  display: flex;
  flex-direction: row;
  background: #FFFFFF;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}
.itinerary-left-line {
  width: 4px;
  flex-shrink: 0;
  background: linear-gradient(180deg, #95B8A3, #B8C5D6);
  border-radius: 4px 0 0 4px;
}
.itinerary-content {
  flex: 1;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.itinerary-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.itinerary-icon {
  font-size: 18px;
}
.itinerary-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
.itinerary-tag {
  align-self: flex-start;
  background-color: #E8F5EC;
  border-radius: 20px;
  padding: 3px 12px;
}
.itinerary-tag-text {
  font-size: 12px;
  color: #5A9A6E;
  font-weight: 500;
}
.itinerary-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
.itinerary-btn-detail {
  padding: 8px 16px;
  border-radius: 20px;
  background: #F5F3EF;
}
.itinerary-btn-text {
  font-size: 13px;
  color: #777;
}
.itinerary-btn-save {
  padding: 8px 16px;
  border-radius: 20px;
  background: linear-gradient(135deg, #95B8A3, #7DA68E);
}
.itinerary-btn-save-text {
  font-size: 13px;
  color: #fff;
  font-weight: 500;
}

/* ===== 滚动锚点 ===== */
.scroll-anchor {
  height: 16px;
}

/* ===== 底部输入栏 ===== */
.input-bar {
  padding: 10px 16px;
  padding-bottom: calc(60px + env(safe-area-inset-bottom));
  background: rgba(255, 248, 240, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  flex-shrink: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}
.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: #F5F0EB;
  border-radius: 24px;
  padding: 6px 6px 6px 18px;
}
.input-field {
  flex: 1;
  min-height: 36px;
  max-height: 120px;
  padding: 8px 0;
  font-size: 15px;
  color: #333;
  background: transparent;
  line-height: 1.5;
}
.input-placeholder {
  color: #C4B8A8;
}
.send-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}
.send-btn-active {
  background: linear-gradient(135deg, #E8A87C, #D4A574);
  box-shadow: 0 2px 8px rgba(232, 168, 124, 0.4);
}
.send-btn-inactive {
  background: #E0D8CE;
}
.send-arrow {
  font-size: 18px;
  color: #fff;
  font-weight: bold;
  line-height: 1;
}

/* ===== 动画 ===== */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
