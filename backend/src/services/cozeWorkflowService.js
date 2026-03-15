const logger = require('../utils/logger');

/**
 * Coze 站点工作流 stream_run 调用
 * 请求/响应格式见 docs/Coze工作流请求与响应格式.md
 */
class CozeWorkflowService {
  constructor() {
    this.streamUrl = process.env.COZE_SITE_STREAM_URL || '';
    this.token = process.env.COZE_SITE_TOKEN || '';
    this.projectId = process.env.COZE_PROJECT_ID || '';
    this.debugStream = process.env.COZE_DEBUG_STREAM === '1' || process.env.COZE_DEBUG_STREAM === 'true';
  }

  _getConfig() {
    if (!this.streamUrl || !this.token || !this.projectId) {
      throw new Error('COZE_SITE_STREAM_URL / COZE_SITE_TOKEN / COZE_PROJECT_ID 未配置');
    }
    return { streamUrl: this.streamUrl, token: this.token, projectId: this.projectId };
  }

  /**
   * 构建 Coze 站点 stream_run 的 body
   * @param {Object} payload - 我们约定的 { type: 'posts'|'chat', content?: string, messages?: array }
   * @param {string} sessionId - 会话 ID
   */
  buildCozeBody(payload, sessionId) {
    const { projectId } = this._getConfig();
    const promptText = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return {
      content: {
        query: {
          prompt: [
            { type: 'text', content: { text: promptText } }
          ]
        }
      },
      type: 'query',
      session_id: sessionId,
      project_id: this.projectId
    };
  }

  /**
   * 从 Coze 返回的文本中解析我们约定的响应格式 { itineraries, data?, content? }
   */
  parseWorkflowResponse(text) {
    if (!text || typeof text !== 'string') {
      return { itineraries: false, content: '' };
    }
    let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed.itineraries === 'boolean') {
        return {
          itineraries: parsed.itineraries,
          data: parsed.data,
          content: parsed.content != null ? String(parsed.content) : ''
        };
      }
    } catch (_) {}
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        if (parsed && typeof parsed.itineraries === 'boolean') {
          return {
            itineraries: parsed.itineraries,
            data: parsed.data,
            content: parsed.content != null ? String(parsed.content) : ''
          };
        }
      } catch (_) {}
    }
    return { itineraries: false, content: cleaned || text };
  }

  /**
   * 调用 Coze stream_run，将 SSE 转发到 res，结束时发送 done 并解析结果
   * @param {Object} payload - { type: 'chat'|'posts', content?: string, messages?: array }
   * @param {string} sessionId
   * @param {import('express').Response} res - Express 响应对象，会设置 SSE 头并写入流
   * @param {Function} onDone - (parsed: { content, itineraries, itineraryData? }) => void 流结束并解析后的回调
   */
  async streamWorkflowToResponse(payload, sessionId, res, onDone) {
    const { streamUrl, token } = this._getConfig();
    const body = this.buildCozeBody(payload, sessionId);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders && res.flushHeaders();

    const sendEvent = (event, data) => {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      const escaped = payload.replace(/\n/g, '\ndata: ');
      res.write(`event: ${event}\ndata: ${escaped}\n\n`);
      if (res.flush) res.flush();
    };

    let buffer = '';
    const eventDataList = [];

    try {
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        sendEvent('error', { message: `Coze HTTP ${response.status}`, detail: errText });
        res.end();
        if (onDone) onDone({ itineraries: false, content: '', error: errText });
        return;
      }

      if (!response.body) {
        sendEvent('error', { message: 'No response body' });
        res.end();
        if (onDone) onDone({ itineraries: false, content: '' });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let answerText = '';
      let thinkingText = '';
      let streamUsed = false;
      let streamController = null;
      let lastContentLen = 0;
      let streamFinalValue = null;

      const stream = new ReadableStream({
        start(c) { streamController = c; }
      });
      const parseLoop = (async () => {
        try {
          const { parse: parseStreamingJson } = await import('jsonriver');
          for await (const value of parseStreamingJson(stream)) {
            if (value && typeof value === 'object') {
              streamFinalValue = value;
              if (typeof value.content === 'string' && value.content.length > lastContentLen) {
                lastContentLen = value.content.length;
                sendEvent('content', value.content);
              }
            }
          }
        } catch (e) {
          logger.error('CozeWorkflowService jsonriver parse error:', e);
        }
      })();

      const extractDisplayContent = (dataText) => {
        let ev;
        try {
          ev = typeof dataText === 'string' ? JSON.parse(dataText) : dataText;
        } catch (_) {
          return null;
        }
        if (this.debugStream) {
          logger.info('[Coze SSE]', ev?.type || 'unknown', Object.keys(ev || {}).join(', '));
        }
        if (!ev || typeof ev !== 'object') return null;
        const type = ev.type;
        if (type === 'message_end') return null;
        const c = ev.content;
        let text = null;
        let thinking = null;
        if (c != null && typeof c === 'object') {
          thinking = c.thinking ?? c.reasoning ?? c.thought;
          text = c.answer ?? c.content ?? c.delta ?? (c.message && c.message.content);
          if (text == null && Array.isArray(c.parts)) {
            text = c.parts.map(p => p.text ?? p.content).filter(Boolean).join('');
          }
        }
        if (thinking == null && typeof ev.thinking === 'string') thinking = ev.thinking;
        if (text == null && typeof ev.answer === 'string') text = ev.answer;
        if (text == null && typeof ev.content === 'string') text = ev.content;
        if (text == null && typeof ev.delta === 'string') text = ev.delta;
        if (thinking != null && typeof thinking !== 'string') thinking = String(thinking);
        if (text != null && typeof text !== 'string') text = String(text);
        if (ev.itineraries !== undefined) return { text: dataText, isWorkflowOutput: true };
        if ((thinking != null && thinking.length > 0) || (text != null && text.length > 0)) {
          return { thinking: thinking || undefined, text: text || undefined };
        }
        return null;
      };

      let readDone = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          readDone = true;
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';
        for (const block of blocks) {
          if (!block.trim()) continue;
          const dataLines = block
            .split('\n')
            .filter(line => line.startsWith('data:'))
            .map(line => line.slice(5).trim());
          if (dataLines.length === 0) continue;
          const dataText = dataLines.join('\n');
          let ev;
          try {
            ev = JSON.parse(dataText);
          } catch (_) {
            if (dataText.trim().startsWith('{') && streamController) {
              streamController.enqueue(dataText);
              streamUsed = true;
            } else {
              answerText += dataText;
              sendEvent('chunk', dataText);
            }
            continue;
          }
          if (ev && ev.type === 'message_end') continue;
          if (ev && ev.itineraries !== undefined) {
            if (streamController) {
              streamController.enqueue(dataText);
              streamController.close();
              streamUsed = true;
            }
            answerText = dataText;
            readDone = true;
            break;
          }
          const extracted = extractDisplayContent(dataText);
          if (extracted) {
            if (extracted.isWorkflowOutput) {
              answerText = dataText;
              if (streamController) {
                streamController.enqueue(dataText);
                streamController.close();
                streamUsed = true;
              }
              readDone = true;
              break;
            }
            if (extracted.thinking) {
              thinkingText += extracted.thinking;
              sendEvent('thinking', extracted.thinking);
            }
            if (extracted.text) {
              answerText += extracted.text;
              sendEvent('chunk', extracted.text);
            }
          }
        }
        if (readDone) break;
      }

      if (buffer.trim()) {
        const dataLines = buffer.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim());
        if (dataLines.length) {
          const dataText = dataLines.join('\n');
          try {
            const ev = JSON.parse(dataText);
            if (ev && ev.itineraries !== undefined && streamController) {
              streamController.enqueue(dataText);
              streamController.close();
              streamUsed = true;
            }
          } catch (_) {
            if (dataText.trim().startsWith('{') && streamController) {
              streamController.enqueue(dataText);
              streamUsed = true;
            }
          }
          const extracted = extractDisplayContent(dataText);
          if (extracted && !extracted.isWorkflowOutput) {
            if (extracted.thinking) thinkingText += extracted.thinking;
            if (extracted.text) answerText += extracted.text;
          } else if (extracted && extracted.isWorkflowOutput) {
            answerText = dataText;
          }
        }
      }

      // 必须关闭流，否则 parseLoop 会一直等待，后端卡住、前端收不到 done
      if (streamController) {
        try {
          streamController.close();
        } catch (_) {}
      }
      await parseLoop;

      let parsed;
      let donePayload;
      if (streamUsed && streamFinalValue && typeof streamFinalValue === 'object') {
        parsed = {
          itineraries: !!streamFinalValue.itineraries,
          data: streamFinalValue.data,
          content: streamFinalValue.content != null ? String(streamFinalValue.content) : ''
        };
        donePayload = {
          content: parsed.content,
          thinking: thinkingText || undefined,
          itineraries: !!parsed.itineraries,
          itineraryData: parsed.itineraries ? parsed.data : undefined,
          rawOutput: undefined
        };
      } else {
        parsed = this.parseWorkflowResponse(answerText);
        donePayload = {
          content: parsed.content || answerText,
          thinking: thinkingText || undefined,
          itineraries: !!parsed.itineraries,
          itineraryData: parsed.itineraries ? parsed.data : undefined,
          rawOutput: answerText && (parsed.itineraries || answerText.trim().startsWith('{')) ? answerText : undefined
        };
      }
      sendEvent('done', donePayload);
      res.end();
      if (onDone) onDone(donePayload);
    } catch (err) {
      logger.error('CozeWorkflowService stream error:', err);
      sendEvent('error', { message: err.message || 'Stream failed' });
      res.end();
      if (onDone) onDone({ itineraries: false, content: '', error: err.message });
    }
  }
}

module.exports = new CozeWorkflowService();
