import http, { BASE_URL } from '@/utils/request';

export interface Post {
  id: number;
  title: string;
  content: string;
  images: string[];
  user_id: number;
  user: {
    id: number;
    username: string;
    avatar: string;
    nickname: string;
  };
  likes: number;
  comments: number;
  isLiked: boolean;
  created_at: string;
  location?: string;
  tags?: string[];
  type?: string;
  privacy?: string;
}

export interface GetPostsParams {
  page?: number;
  limit?: number;
  type?: string;
  feed?: 'recommend' | 'following';
  userId?: number | string;
  keyword?: string;
  tag?: string;
}

export const getPosts = (params: GetPostsParams) => {
  const p: Record<string, string | number> = {};
  if (params.page != null) p.page = params.page;
  if (params.limit != null) p.limit = params.limit;
  if (params.type) p.type = params.type;
  if (params.feed) p.feed = params.feed;
  if (params.userId != null) p.userId = params.userId;
  if (params.keyword) p.keyword = params.keyword;
  if (params.tag) p.tag = params.tag;
  return http.get('/posts', p);
};

export const getPostById = (id: number | string) => {
  return http.get(`/posts/${id}`);
};

export const createPost = (data: { 
  title: string; 
  content: string; 
  images: string[];
  location?: string;
  tags?: string[];
  type?: string;
  privacy?: string;
}) => {
  return http.post('/posts', data);
};

export const deletePost = (id: number | string) => {
  return http.delete(`/posts/${id}`);
};

/** 从帖子生成行程的 SSE 完成回调 payload（与 chat 的 StreamDonePayload 一致） */
export interface GenerateItineraryDonePayload {
  content: string;
  thinking?: string;
  itineraries: boolean;
  itineraryData?: any;
  rawOutput?: string;
}

/**
 * 从帖子正文生成行程（SSE 流式），回调签名对齐 chat.ts 的 sendMessageStream
 * @param postId 帖子 ID
 * @param onChunk 每收到一块回答内容时 (chunkText: string) => void
 * @param onDone 流结束 (payload: GenerateItineraryDonePayload) => void
 * @param onContent 边流式边解析时，当前已解析出的完整 content (content: string) => void
 * @param onThinking 每收到一块思考过程时 (thinkingText: string) => void
 * @param onError (err: any) => void
 */
export function generateItineraryFromPost(
  postId: number | string,
  onChunk: (chunkText: string) => void,
  onDone: (payload: GenerateItineraryDonePayload) => void,
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

  const url = `${BASE_URL}/posts/${postId}/generate-itinerary`;
  fetch(url, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    }
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
        if (currentEvent === 'chunk') {
          try {
            const parsed = JSON.parse(currentData);
            const text = typeof parsed === 'string' ? parsed : (parsed.content ?? parsed.delta ?? parsed.text ?? currentData);
            onChunk(typeof text === 'string' ? text : String(currentData));
          } catch (_) {
            onChunk(currentData);
          }
        } else if (currentEvent === 'content') {
          try {
            const parsed = JSON.parse(currentData);
            const text = typeof parsed === 'string' ? parsed : (parsed.content ?? parsed.text ?? currentData);
            onContent?.(typeof text === 'string' ? text : String(currentData));
          } catch (_) {
            onContent?.(currentData);
          }
        } else if (currentEvent === 'thinking') {
          try {
            const parsed = JSON.parse(currentData);
            const text = typeof parsed === 'string' ? parsed : (parsed.content ?? parsed.text ?? currentData);
            onThinking?.(typeof text === 'string' ? text : String(currentData));
          } catch (_) {
            onThinking?.(currentData);
          }
        } else if (currentEvent === 'done') {
          gotDone = true;
          try {
            const payload = JSON.parse(currentData) as GenerateItineraryDonePayload;
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
      if (!gotDone) onDone({ content: '', itineraries: false });
    })
    .catch((err) => {
      onError?.(err);
    });
}
