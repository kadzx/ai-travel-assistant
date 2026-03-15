<template>
  <view class="flex flex-col h-screen bg-gray-50">
    <!-- Custom Header -->
    <view class="bg-white border-b border-gray-100 pt-12 pb-3 px-4 sticky top-0 z-50">
      <view class="flex items-center gap-3">
        <!-- Robot Icon with Gradient Background -->
        <view class="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-[#FF2442] to-[#FF899D] shadow-md shadow-red-100">
          <text class="text-xl">🤖</text>
        </view>
        <view>
          <view class="flex items-center gap-2">
            <text class="text-lg font-bold text-gray-900">AI 旅行策划师</text>
            <view class="px-1.5 py-0.5 bg-green-100 rounded text-[10px] text-green-600 font-medium flex items-center gap-0.5">
              <view class="w-1.5 h-1.5 bg-green-500 rounded-full"></view>
              在线
            </view>
          </view>
          <text class="text-xs text-gray-400">24小时为您规划完美行程</text>
        </view>
      </view>
    </view>

    <!-- Chat Area -->
    <scroll-view 
      scroll-y 
      class="flex-1 px-4 py-4 box-border" 
      :scroll-into-view="scrollTarget"
      :scroll-with-animation="true"
    >
      <!-- Welcome Message (Empty State) -->
      <view v-if="messages.length === 0" class="flex flex-col items-center justify-center py-10 opacity-0 animate-fade-in-up" style="animation-fill-mode: forwards;">
        <view class="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-sm mb-4">
          <text class="text-4xl">👋</text>
        </view>
        <text class="text-gray-900 font-bold text-lg mb-2">你好！我是您的专属旅行顾问</text>
        <text class="text-gray-500 text-sm text-center px-8 leading-relaxed">
          告诉我你想去哪里，喜欢什么样的风格，我来为您定制专属行程。
        </text>
        
        <!-- Quick Prompts -->
        <view class="flex flex-wrap justify-center gap-3 mt-8">
          <view 
            v-for="(prompt, idx) in quickPrompts" 
            :key="idx"
            class="bg-white px-4 py-2 rounded-full border border-gray-100 text-sm text-gray-600 shadow-sm active:scale-95 transition-transform"
            @click="sendMessage(prompt)"
          >
            {{ prompt }}
          </view>
        </view>
      </view>

      <!-- Message List -->
      <view class="flex flex-col gap-6 pb-4">
        <view 
          v-for="(msg, index) in messages" 
          :key="index" 
          :id="'msg-' + index"
          class="flex w-full flex-col"
          :class="msg.role === 'user' ? 'items-end' : 'items-start'"
        >
          <view 
            class="flex max-w-[85%]"
            :class="msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
          >
            <!-- Avatar -->
            <view 
              class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden"
              :class="msg.role === 'user' ? 'ml-3 bg-gray-200' : 'mr-3 bg-gradient-to-br from-[#FF2442] to-[#FF899D]'"
            >
              <image v-if="msg.role === 'user'" :src="userAvatar" mode="aspectFill" class="w-full h-full" />
              <text v-else class="text-xl">🤖</text>
            </view>
            <!-- 右侧：思考过程 + 回复气泡 -->
            <view class="flex-1 flex flex-col gap-2 min-w-0">
              <!-- 思考过程 / 行程详情（可折叠，仅助手消息，展示可读内容不展示 JSON） -->
              <view 
                v-if="msg.role === 'assistant' && (msg.thinking || msg.streamingSummary || formatItineraryReadable(msg.itineraryData) || msg.isLoading)" 
                class="rounded-xl bg-gray-100 border border-gray-200 overflow-hidden"
              >
                <view 
                  class="px-3 py-2 flex items-center justify-between"
                  @click="toggleThinking(index)"
                >
                  <text class="text-xs text-gray-500 font-medium">{{ collapsibleTitle(msg) }}</text>
                  <text class="text-gray-400 text-xs">{{ msg.thinkingExpanded ? '收起' : '展开' }}</text>
                </view>
                <view v-show="msg.thinkingExpanded" class="px-3 pb-3 pt-0">
                  <text v-if="msg.thinking" class="text-sm text-gray-600 whitespace-pre-wrap block">{{ msg.thinking }}</text>
                  <text v-if="msg.streamingSummary" class="text-sm text-gray-700 whitespace-pre-wrap block mt-2">{{ msg.streamingSummary }}</text>
                  <text v-if="formatItineraryReadable(msg.itineraryData)" class="text-sm text-gray-700 whitespace-pre-wrap block mt-2">{{ formatItineraryReadable(msg.itineraryData) }}</text>
                  <text v-if="msg.isLoading && !msg.thinking && !msg.streamingSummary && !formatItineraryReadable(msg.itineraryData)" class="text-sm text-gray-500">思考中...</text>
                </view>
              </view>
              <!-- Bubble：流式时若是 JSON 不展示原文，只显示「正在生成行程...」 -->
              <view 
                class="px-4 py-3 rounded-2xl text-base leading-relaxed shadow-sm relative"
                :class="[
                  msg.role === 'user' 
                    ? 'bg-[#FF2442] text-white rounded-tr-sm' 
                    : 'bg-white text-gray-800 rounded-tl-sm'
                ]"
              >
                <text :user-select="true">{{ bubbleDisplayContent(msg) }}</text>
                <view v-if="msg.isLoading" class="flex gap-1 py-1">
                  <view class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></view>
                  <view class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></view>
                  <view class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></view>
                </view>
              </view>
            </view>
          </view>
          <!-- 保存为行程按钮（仅当该条为助手消息且含 itineraryData 时） -->
          <view 
            v-if="msg.role === 'assistant' && msg.itineraryData && !msg.isLoading" 
            class="mt-2 ml-12"
          >
            <view 
              class="px-4 py-2 rounded-full bg-[#FF2442] text-white text-sm"
              @click="saveItineraryFromMessage(msg)"
            >
              保存为行程
            </view>
          </view>
        </view>
      </view>
      
      <!-- Invisible anchor for scrolling -->
      <view id="scroll-bottom" class="h-4"></view>
    </scroll-view>

    <!-- Input Area -->
    <view class="bg-white border-t border-gray-100 px-4 py-3 pb-safe">
      <view class="flex items-end gap-3 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-100 focus-within:border-[#FF2442]/30 focus-within:ring-2 focus-within:ring-[#FF2442]/10 transition-all">
        <textarea 
          v-model="inputContent"
          class="flex-1 min-h-[40px] max-h-[120px] py-2 text-base text-gray-900 bg-transparent"
          placeholder="问问京都哪里好玩..."
          :auto-height="true"
          :show-confirm-bar="false"
          cursor-spacing="20"
        ></textarea>
        
        <view 
          class="w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all"
          :class="isValid ? 'bg-[#FF2442] shadow-md shadow-red-200' : 'bg-gray-200'"
          @click="handleSend"
        >
          <!-- Fixed: Use plain text arrow or ensure u-icon is rendered correctly -->
          <!-- Using text arrow as fallback or checking u-icon usage -->
          <u-icon name="arrow-up" :color="isValid ? '#ffffff' : '#999999'" size="18" :bold="true"></u-icon>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { startSession, sendMessageStream, getHistory } from '@/api/chat';
import { saveItinerary } from '@/api/itinerary';
// @ts-ignore
import UIcon from 'uview-plus/components/u-icon/u-icon.vue';

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
      uni.showToast({ title: '无法连接服务器，请确保后端已启动 (localhost:3000)', icon: 'none', duration: 3000 });
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
  messages.value.push({ role: 'assistant', content: '', thinking: '', thinkingExpanded: false, isLoading: true, chunkBuffer: '', streamingSummary: '' });
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
        msg.content = err?.message || '网络连接失败，请检查您的网络。';
      }
      isSending.value = false;
      scrollToBottom();
      uni.showToast({ title: err?.message || '请求失败', icon: 'none' });
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
  if (destMatch) lines.push(`目的地：${destMatch[1]}`);

  const startMatch = raw.match(/"startDate"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const endMatch = raw.match(/"endDate"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (startMatch || endMatch) {
    const start = startMatch ? startMatch[1] : '—';
    const end = endMatch ? endMatch[1] : '—';
    lines.push(`出行时间：${start} 至 ${end}`);
  }

  const budgetMatch = raw.match(/"budgetLevel"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (budgetMatch) {
    const level = budgetMatch[1];
    const levelText = level === 'low' ? '经济' : level === 'high' ? '高端' : '中等';
    lines.push(`预算：${levelText}`);
  }

  const styleMatch = raw.match(/"styleTags"\s*:\s*\[([^\]]*)\]/);
  if (styleMatch && styleMatch[1].trim()) {
    const tags = styleMatch[1].match(/"((?:[^"\\]|\\.)*)"/g);
    if (tags && tags.length) lines.push(`风格：${tags.map(t => t.slice(1, -1)).join('、')}`);
  }

  const titleMatches = raw.matchAll(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g);
  const titles = [...titleMatches].map(m => m[1]);
  if (titles.length) {
    lines.push('');
    lines.push('已识别景点/安排：');
    titles.forEach((t, i) => lines.push(`· ${i + 1}. ${t}`));
  }

  if (lines.length === 0) return '';
  return lines.join('\n');
};

/** 把行程数据解析成普通人能看懂的文案，不展示 JSON */
const formatItineraryReadable = (data: any): string => {
  if (!data || typeof data !== 'object' || !Array.isArray(data.nodes)) return '';
  const dest = data.destination || '目的地';
  const start = data.startDate || '';
  const end = data.endDate || '';
  const days = data.summary?.totalDays || 0;
  const total = data.summary?.totalNodes || data.nodes.length;
  const cost = data.summary?.estimatedCost;
  const lines: string[] = [];
  lines.push('【行程概览】');
  lines.push(`目的地：${dest}`);
  if (start || end) lines.push(`出行时间：${start || '—'} 至 ${end || '—'}${days ? `（${days} 天）` : ''}`);
  lines.push(`共 ${total} 个安排${cost != null ? ` · 预估费用约 ${cost} 元` : ''}`);
  lines.push('');
  const byDay: Record<number, typeof data.nodes> = {};
  for (const n of data.nodes) {
    const d = n.dayIndex ?? 1;
    if (!byDay[d]) byDay[d] = [];
    byDay[d].push(n);
  }
  const daysOrder = Object.keys(byDay).map(Number).sort((a, b) => a - b);
  for (const d of daysOrder) {
    lines.push(`【第 ${d} 天】`);
    for (const n of byDay[d]) {
      const time = n.timeSlot ? `${n.timeSlot} ` : '';
      lines.push(`· ${time}${n.title || '行程节点'}`);
      if (n.location) lines.push(`  地点：${n.location}`);
      if (n.notes) lines.push(`  备注：${n.notes}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
};

const collapsibleTitle = (msg: Message): string => {
  if (msg.thinking && formatItineraryReadable(msg.itineraryData)) return '思考过程 · 行程详情';
  if (msg.streamingSummary && msg.isLoading) return '生成中…';
  if (formatItineraryReadable(msg.itineraryData)) return '行程安排详情';
  return '思考过程';
};

/** 主气泡展示文案：流式阶段若收到的是 JSON 片段，不直接展示，改为友好提示 */
const bubbleDisplayContent = (msg: Message): string => {
  if (msg.role !== 'assistant') return msg.content;
  const raw = (msg.content || '').trim();
  const looksLikeJson = raw.startsWith('{') || raw.startsWith('```');
  if (msg.isLoading && looksLikeJson) return '正在生成行程，请稍候...';
  return msg.content || '';
};

const saveItineraryFromMessage = async (msg: Message) => {
  if (!msg.itineraryData) return;
  try {
    uni.showLoading({ title: '保存中...' });
    const content = msg.itineraryData;
    const title = content.title || content.destination || 'AI 生成行程';
    const startDate = content.startDate || null;
    const endDate = content.endDate || null;
    const res: any = await saveItinerary({
      title,
      start_date: startDate,
      end_date: endDate,
      content
    });
    uni.hideLoading();
    uni.showToast({ title: '已保存为行程', icon: 'success' });
    if (res?.id) {
      uni.navigateTo({ url: `/pages/itinerary/detail?id=${res.id}` });
    }
  } catch (e: any) {
    uni.hideLoading();
    uni.showToast({ title: e?.message || '保存失败', icon: 'none' });
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
.pb-safe {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.6s ease-out;
}

.animate-bounce {
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.delay-100 {
  animation-delay: 0.1s;
}

.delay-200 {
  animation-delay: 0.2s;
}
</style>
