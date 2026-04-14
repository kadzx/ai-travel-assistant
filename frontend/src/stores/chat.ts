import { defineStore } from 'pinia';
import { ref } from 'vue';

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

  const clearMessages = () => {
    messages.value = [];
  };

  return {
    messages,
    sessionId,
    loading,
    clearMessages,
  };
});
