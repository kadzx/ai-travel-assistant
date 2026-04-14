import { BASE_URL } from './request';

export interface SSECallbacks {
  onChunk?: (text: string) => void;
  onContent?: (text: string) => void;
  onThinking?: (text: string) => void;
  onDone: (payload: any) => void;
  onError?: (err: any) => void;
}

function extractText(raw: string, ...keys: string[]): string {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
    for (const k of keys) {
      if (parsed[k] != null) return String(parsed[k]);
    }
  } catch (_) {}
  return raw;
}

function getToken(): string {
  try {
    const userState = uni.getStorageSync('user');
    if (userState) return JSON.parse(userState).token || '';
  } catch (_) {}
  return '';
}

export function sseRequest(
  path: string,
  options: { method?: string; body?: any },
  callbacks: SSECallbacks
): void {
  const token = getToken();
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

  fetch(url, {
    method: options.method || 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errText = await response.text();
        callbacks.onError?.(new Error(`HTTP ${response.status}: ${errText}`));
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) {
        callbacks.onError?.(new Error('No response body'));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';
      const dataLines: string[] = [];
      let gotDone = false;

      const flush = (): boolean => {
        const data = dataLines.join('\n').trim();
        dataLines.length = 0;
        if (!currentEvent && !data) return false;

        switch (currentEvent) {
          case 'thinking':
            callbacks.onThinking?.(extractText(data, 'content', 'text'));
            break;
          case 'content':
            callbacks.onContent?.(extractText(data, 'content', 'text'));
            break;
          case 'chunk':
            callbacks.onChunk?.(extractText(data, 'content', 'delta', 'text'));
            break;
          case 'done':
            gotDone = true;
            try { callbacks.onDone(JSON.parse(data)); }
            catch (_) { callbacks.onDone({ content: data, itineraries: false }); }
            return true;
          case 'error':
            gotDone = true;
            try { callbacks.onError?.(new Error(JSON.parse(data).message || data)); }
            catch (_) { callbacks.onError?.(new Error(data)); }
            return true;
        }
        currentEvent = '';
        return false;
      };

      const processLines = (lines: string[]): boolean => {
        for (const line of lines) {
          if (line.startsWith('event:')) {
            if (currentEvent || dataLines.length) { if (flush()) return true; }
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
          } else if (line === '') {
            if (flush()) return true;
          }
        }
        return false;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        if (processLines(lines)) return;
      }

      if (buffer.trim()) {
        if (processLines(buffer.split('\n'))) return;
      }
      flush();
      if (!gotDone) callbacks.onDone({ content: '', itineraries: false });
    })
    .catch((err) => callbacks.onError?.(err));
}
