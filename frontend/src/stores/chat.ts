import { defineStore } from 'pinia';
import { ref } from 'vue';
import http from '@/utils/request';

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
      const res: any = await http.post('/chat/session');
      if (res && res.sessionId) {
        sessionId.value = res.sessionId;
      }
      return res;
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
      const res: any = await http.post('/chat/message', { 
        content, 
        sessionId: sessionId.value 
      });
      
      if (res && res.content) {
        const assistantMsg: Message = {
          role: 'assistant',
          content: res.content,
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
      const res: any = await http.get(`/chat/history/${sessionId.value}`);
      if (res) {
        messages.value = res;
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
