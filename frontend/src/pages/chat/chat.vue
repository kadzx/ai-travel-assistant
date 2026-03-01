<template>
  <view class="container">
    <scroll-view 
      scroll-y 
      class="chat-list" 
      :scroll-into-view="scrollIntoView"
      :scroll-with-animation="true"
    >
      <view class="message-wrapper" id="message-list-top"></view>
      <view 
        v-for="(msg, index) in chatStore.messages" 
        :key="index" 
        :id="'msg-' + index"
        :class="['message', msg.role === 'user' ? 'user' : 'assistant']"
      >
        <view class="avatar">
          <u-avatar 
            :src="msg.role === 'user' ? (userStore.userInfo?.avatar || '') : '/static/logo.png'" 
            :text="msg.role === 'user' ? 'Me' : 'AI'"
            shape="square"
          ></u-avatar>
        </view>
        <view class="content">
          <text>{{ msg.content }}</text>
        </view>
      </view>
      
      <!-- Loading indicator -->
      <view v-if="chatStore.loading" class="message assistant loading-msg" id="loading-msg">
        <view class="avatar">
          <u-avatar text="AI" shape="square"></u-avatar>
        </view>
        <view class="content loading-content">
          <u-loading-icon mode="dots" color="#999"></u-loading-icon>
        </view>
      </view>
      
      <view id="scroll-bottom" style="height: 20px;"></view>
    </scroll-view>
    
    <view class="input-area">
      <u-input 
        v-model="inputContent" 
        placeholder="请输入您的问题..." 
        border="surround"
        shape="circle"
        customStyle="flex: 1; margin-right: 10px; background-color: #f8f8f8;"
        @confirm="send"
      ></u-input>
      <u-button 
        type="primary" 
        size="small" 
        text="发送" 
        @click="send"
        customStyle="width: 70px; border-radius: 20px;"
        :disabled="chatStore.loading || !inputContent.trim()"
      ></u-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useUserStore } from '@/stores/user';

const chatStore = useChatStore();
const userStore = useUserStore();
const inputContent = ref('');
const scrollIntoView = ref('');

const scrollToBottom = () => {
  nextTick(() => {
    scrollIntoView.value = 'scroll-bottom';
  });
};

const send = async () => {
  if (!inputContent.value.trim() || chatStore.loading) return;
  const content = inputContent.value;
  inputContent.value = '';
  
  // Reset scroll view target to force update if needed
  scrollIntoView.value = '';
  
  await chatStore.sendMessage(content);
};

// Watch for new messages to scroll to bottom
watch(() => chatStore.messages.length, () => {
  scrollToBottom();
});

watch(() => chatStore.loading, (newVal) => {
    if (newVal) {
        scrollToBottom();
    }
});

onMounted(() => {
  if (chatStore.messages.length === 0) {
    chatStore.loadHistory();
  } else {
    scrollToBottom();
  }
});
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.chat-list {
  flex: 1;
  padding: 15px;
  box-sizing: border-box;
  overflow-y: auto;
  // Ensure content doesn't get hidden behind input area if needed
  padding-bottom: 20px; 
}

.message {
  display: flex;
  margin-bottom: 20px;
  
  .avatar {
    width: 40px;
    height: 40px;
    margin-right: 10px;
    flex-shrink: 0;
  }
  
  .content {
    background-color: #fff;
    padding: 10px 15px;
    border-radius: 8px;
    max-width: 70%;
    word-break: break-all;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    font-size: 15px;
    line-height: 1.5;
  }
  
  &.user {
    flex-direction: row-reverse;
    
    .avatar {
      margin-right: 0;
      margin-left: 10px;
    }
    
    .content {
      background-color: #3c9cff;
      color: #fff;
      border-top-right-radius: 2px;
    }
  }

  &.assistant {
    .content {
      background-color: #fff;
      color: #333;
      border-top-left-radius: 2px;
    }
  }
}

.loading-content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  min-height: 40px;
}

.input-area {
  padding: 10px 15px;
  background-color: #fff;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
}
</style>
