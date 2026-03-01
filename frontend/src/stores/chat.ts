import { defineStore } from 'pinia';
import { ref } from 'vue';
import { request } from '@/utils/request';

export interface Message {
  id?: number | string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  [key: string]: any;
}

export const useChatStore = defineStore('chat', () => {
  const messages = ref<Message[]>([]);
  const sessionId = ref<string>('');
  const loading = ref(false);

  const startSession = async () => {
    try {
      const res: any = await request({ url: '/chat/session', method: 'POST' });
      if (res.data && res.data.sessionId) {
        sessionId.value = res.data.sessionId;
      }
      return res.data;
    } catch (error) {
      console.error('Start chat session error:', error);
      throw error;
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Optimistic update
    const userMsg: Message = { 
      role: 'user', 
      content, 
      timestamp: Date.now(),
      id: Date.now() 
    };
    messages.value.push(userMsg);
    loading.value = true;

    try {
      const res: any = await request({ 
        url: '/chat/send', 
        method: 'POST', 
        data: { 
          content, 
          sessionId: sessionId.value 
        } 
      });
      
      if (res.data && res.data.reply) {
        const assistantMsg: Message = {
          role: 'assistant',
          content: res.data.reply,
          timestamp: Date.now(),
          id: Date.now() + 1
        };
        messages.value.push(assistantMsg);
      }
    } catch (error) {
      console.error('Send message error:', error);
      // Optional: Remove optimistic message or show error
      uni.showToast({
        title: 'Send failed',
        icon: 'none'
      });
    } finally {
      loading.value = false;
    }
  };

  const loadHistory = async () => {
    loading.value = true;
    try {
      const res: any = await request({ url: '/chat/history', method: 'GET' });
      if (res.data) {
        messages.value = res.data;
      }
    } catch (error) {
      console.error('Load chat history error:', error);
    } finally {
      loading.value = false;
    }
  };
  
  const clearMessages = () => {
      messages.value = [];
  }

  return { 
    messages, 
    sessionId, 
    loading,
    startSession, 
    sendMessage, 
    loadHistory,
    clearMessages
  };
});
