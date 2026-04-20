import http from '@/utils/request';
import { sseRequest } from '@/utils/sse';

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  itineraryData?: any;
}

export interface StreamDonePayload {
  content: string;
  thinking?: string;
  itineraries: boolean;
  itineraryData?: any;
  rawOutput?: string;
}

export const startSession = () => {
  return http.post<{ sessionId: string }>('/chat/session');
};

export function sendMessageStream(
  data: { sessionId: string; content: string },
  onChunk: (chunkText: string) => void,
  onDone: (payload: StreamDonePayload) => void,
  onContent?: (content: string) => void,
  onThinking?: (thinkingText: string) => void,
  onError?: (err: any) => void
): void {
  sseRequest('/chat/message', { body: data }, {
    onChunk,
    onDone,
    onContent,
    onThinking,
    onError,
  });
}

export const getHistory = (sessionId: string) => {
  return http.get<ChatMessage[]>(`/chat/history/${sessionId}`);
};
