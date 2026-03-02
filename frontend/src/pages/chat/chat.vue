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
          class="flex w-full"
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

          <!-- Bubble -->
          <view 
            class="max-w-[75%] px-4 py-3 rounded-2xl text-base leading-relaxed shadow-sm relative"
            :class="[
              msg.role === 'user' 
                ? 'bg-[#FF2442] text-white rounded-tr-sm' 
                : 'bg-white text-gray-800 rounded-tl-sm'
            ]"
          >
            <text :user-select="true">{{ msg.content }}</text>
            
            <!-- Loading Dots for AI -->
            <view v-if="msg.isLoading" class="flex gap-1 py-1">
              <view class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></view>
              <view class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></view>
              <view class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></view>
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
          <u-icon name="arrow-up" color="#ffffff" size="18" :bold="true"></u-icon>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { startSession, sendMessage as apiSendMessage, getHistory } from '@/api/chat';
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
  isLoading?: boolean;
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
    // Reset to allow re-triggering
    setTimeout(() => { scrollTarget.value = '' }, 100);
  });
};

const initSession = async () => {
  try {
    const res: any = await startSession();
    if (res && res.sessionId) {
      sessionId.value = res.sessionId;
      // Load history if needed, though startSession usually implies new or retrieving existing logic
      // If backend supports persisting session per user, getHistory(sessionId) here
    }
  } catch (e) {
    console.error('Init session failed', e);
  }
};

const sendMessage = async (text: string) => {
  if (!text.trim() || isSending.value) return;
  
  // User Message
  messages.value.push({ role: 'user', content: text });
  inputContent.value = '';
  scrollToBottom();
  
  isSending.value = true;
  
  // AI Placeholder
  messages.value.push({ role: 'assistant', content: '', isLoading: true });
  scrollToBottom();

  if (!sessionId.value) {
    await initSession();
  }

  try {
    const res: any = await apiSendMessage({
      sessionId: sessionId.value,
      content: text
    });

    // Remove loading state
    messages.value.pop();

    if (res && res.content) {
      messages.value.push({
        role: 'assistant',
        content: res.content
      });
    } else {
      messages.value.push({
         role: 'assistant',
         content: '抱歉，我现在有点忙，请稍后再试。'
      });
    }
  } catch (e) {
    messages.value.pop();
    messages.value.push({
       role: 'assistant',
       content: '网络连接失败，请检查您的网络。'
    });
    console.error(e);
  } finally {
    isSending.value = false;
    scrollToBottom();
  }
};

const handleSend = () => {
  sendMessage(inputContent.value);
};

onMounted(() => {
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
