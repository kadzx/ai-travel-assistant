import http from '@/utils/request';

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
}

export const startSession = () => {
  return http.post<{ sessionId: string }>('/chat/session');
};

export const sendMessage = (data: { sessionId: string; content: string }) => {
  return http.post<ChatMessage>('/chat/message', data);
};

export const getHistory = (sessionId: string) => {
  return http.get<ChatMessage[]>(`/chat/history/${sessionId}`);
};
