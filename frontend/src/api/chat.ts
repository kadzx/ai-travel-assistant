import http, { BASE_URL } from '@/utils/request';

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
  /** 工作流原始返回的 JSON 字符串，可折叠展示给用户查看 */
  rawOutput?: string;
}

export const startSession = () => {
  return http.post<{ sessionId: string }>('/chat/session');
};

/**
 * 发送消息，通过 SSE 流式接收回复（仅此一种聊天方式）
 * @param data sessionId, content
 * @param onChunk 每收到一块回答内容时 (chunkText: string) => void
 * @param onDone 流结束 (payload: StreamDonePayload) => void
 * @param onContent 边流式边解析时，当前已解析出的完整 content 文案 (content: string) => void，可选
 * @param onThinking 每收到一块思考过程时 (thinkingText: string) => void，可选
 * @param onError (err: any) => void
 */
export function sendMessageStream(
  data: { sessionId: string; content: string },
  onChunk: (chunkText: string) => void,
  onDone: (payload: StreamDonePayload) => void,
  onContent?: (content: string) => void,
  onThinking?: (thinkingText: string) => void,
  onError?: (err: any) => void
): void {
  let token = '';
  try {
    const userState = uni.getStorageSync('user');
    if (userState) {
      const parsed = JSON.parse(userState);
      token = parsed.token || '';
    }
  } catch (_) {}

  const url = `${BASE_URL}/chat/message`;
  const controller = new AbortController();
  fetch(url, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify(data)
  })
    .then(async (response) => {
      if (!response.ok) {
        const errText = await response.text();
        onError?.(new Error(`HTTP ${response.status}: ${errText}`));
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) {
        onError?.(new Error('No response body'));
        return;
      }
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';
      const currentDataLines: string[] = [];
      let gotDone = false;

      const flushEvent = () => {
        const currentData = currentDataLines.join('\n').trim();
        currentDataLines.length = 0;
        if (!currentEvent && !currentData) return false;
        if (currentEvent === 'thinking') {
          try {
            const parsed = JSON.parse(currentData);
            const text = typeof parsed === 'string' ? parsed : (parsed.content ?? parsed.text ?? currentData);
            onThinking?.(typeof text === 'string' ? text : String(currentData));
          } catch (_) {
            onThinking?.(currentData);
          }
        } else if (currentEvent === 'content') {
          try {
            const parsed = JSON.parse(currentData);
            const text = typeof parsed === 'string' ? parsed : (parsed.content ?? parsed.text ?? currentData);
            onContent?.(typeof text === 'string' ? text : String(currentData));
          } catch (_) {
            onContent?.(currentData);
          }
        } else if (currentEvent === 'chunk') {
          try {
            const parsed = JSON.parse(currentData);
            const text = typeof parsed === 'string' ? parsed : (parsed.content ?? parsed.delta ?? parsed.text ?? currentData);
            onChunk(typeof text === 'string' ? text : String(currentData));
          } catch (_) {
            onChunk(currentData);
          }
        } else if (currentEvent === 'done') {
          gotDone = true;
          try {
            const payload = JSON.parse(currentData) as StreamDonePayload;
            onDone(payload);
          } catch (_) {
            onDone({ content: currentData, itineraries: false });
          }
          return true;
        } else if (currentEvent === 'error') {
          gotDone = true;
          try {
            const err = JSON.parse(currentData);
            onError?.(new Error(err.message || currentData));
          } catch (_) {
            onError?.(new Error(currentData));
          }
          return true;
        }
        currentEvent = '';
        return false;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('event:')) {
            if (currentEvent || currentDataLines.length) {
              if (flushEvent()) return;
            }
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentDataLines.push(line.slice(5).trim());
          } else if (line === '') {
            if (flushEvent()) return;
          }
        }
      }
      // 流结束时处理剩余 buffer（最后一块可能没有结尾 \n\n，导致 done 未被 flush）
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('event:')) {
            if (currentEvent || currentDataLines.length) {
              if (flushEvent()) return;
            }
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            currentDataLines.push(line.slice(5).trim());
          } else if (line === '') {
            if (flushEvent()) return;
          }
        }
      }
      flushEvent();
      if (!gotDone) onDone({ content: '回复已结束', itineraries: false });
    })
    .catch((err) => {
      onError?.(err);
    });
}

export const getHistory = (sessionId: string) => {
  return http.get<ChatMessage[]>(`/chat/history/${sessionId}`);
};
