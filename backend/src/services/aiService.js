const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.apiToken = process.env.COZE_API_TOKEN;
    this.botId = process.env.COZE_BOT_ID;
    // Single AI endpoint policy: only use COZE_API_BASE_URL (v2 chat)
    this.baseUrl = process.env.COZE_API_BASE_URL || 'https://api.coze.cn/open_api/v2/chat';
  }

  /**
   * Generate itinerary based on preferences
   * @param {Object} params - { destination, days, budget, interests, travelers }
   * @returns {Promise<Object>} Generated itinerary JSON
   */
  async generateItinerary(params) {
    try {
      const { destination, days, budget, interests, travelers } = params;

      const prompt = `请为我生成一份${destination}的${days}天旅行计划。
预算：${budget || '不限'}
出行人数：${travelers || 1}
偏好：${Array.isArray(interests) ? interests.join('、') : interests || '不限'}

请直接返回 JSON，不要包含 markdown 格式符号。JSON 结构如下：
{
  "title": "行程标题",
  "destination": "${destination}",
  "days": [
    {
      "day": 1,
      "activities": [
        {
          "time": "09:00-10:30",
          "activity": "活动名称",
          "location": "地点名称",
          "latitude": 30.2500,
          "longitude": 120.1667,
          "transport": "交通方式",
          "cost": 0,
          "notes": "备注"
        }
      ]
    }
  ]
}

注意：每个 activity 的 latitude 和 longitude 请尽量填写该地点真实的经纬度坐标（WGS84）。`;

      const content = await this._callCozeAPI([{ role: 'user', content: prompt }]);

      // Try to extract JSON from response (handle markdown wrapping)
      const parsed = this._tryParseJSON(content);
      if (parsed) return parsed;

      // If Coze returned plain text, wrap it as a fallback
      return { title: `${destination} ${days}日游`, days: [], _rawText: content };
    } catch (error) {
      logger.error('AI Service Generate Itinerary Error:', error);
      throw error;
    }
  }

  /**
   * Try to parse JSON from a string that may contain markdown fences or extra text
   */
  _tryParseJSON(text) {
    if (!text || typeof text !== 'string') return null;
    // Strip markdown code fences
    let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '').trim();
    // Try direct parse
    try { return JSON.parse(cleaned); } catch (_) {}
    // Try to find first { ... } block
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (_) {}
    }
    return null;
  }

  /**
   * Chat with AI
   * @param {Array} messages - History of messages [{ role: 'user'|'assistant', content: '...' }]
   * @returns {Promise<String>} AI response content
   */
  async chat(messages) {
    try {
      return await this._callCozeAPI(messages);
    } catch (error) {
      logger.error('AI Service Chat Error:', error);
      throw error;
    }
  }

  /**
   * Internal method to call Coze API (v2 only)
   * @param {Array} messages
   * @returns {Promise<String>}
   */
  async _callCozeAPI(messages) {
    // If running in mock/dev mode without real keys, return mock response
    if (this.apiToken === 'mock_token') {
      return `[MOCK AI] I received your message: "${messages[messages.length - 1].content}". This is a simulated response because COZE_API_TOKEN is not configured.`;
    }

    if (!this.apiToken || !this.botId) {
      throw new Error('COZE_API_TOKEN or COZE_BOT_ID is not configured');
    }

    return this._callCozeV2API(messages);
  }

  _buildMessages(messages) {
    return messages.map(m => ({
      role: m.role,
      content: m.content,
      content_type: 'text'
    }));
  }

  _extractAnswer(data) {
    const msgList =
      data?.messages ||
      data?.data?.messages ||
      data?.data?.message_list ||
      [];

    if (Array.isArray(msgList)) {
      const assistantMsgs = msgList.filter(m => {
        const role = String(m?.role || '').toLowerCase();
        const type = String(m?.type || '').toLowerCase();
        return role === 'assistant' || type === 'answer';
      });
      if (assistantMsgs.length > 0) {
        return assistantMsgs[assistantMsgs.length - 1]?.content || '';
      }
    }

    return (
      data?.data?.answer ||
      data?.data?.content ||
      data?.answer ||
      data?.content ||
      ''
    );
  }

  async _callCozeV2API(messages) {
    // v2 fields: bot_id, user, query, chat_history, stream
    const lastMsg = messages[messages.length - 1]?.content || '';
    const history = messages.slice(0, -1).map(m => ({
      role: m.role,
      content: m.content,
      content_type: 'text'
    }));

    const payload = {
      bot_id: this.botId,
      user: 'default_user',
      query: lastMsg,
      stream: false
    };

    console.log('Calling Coze API v2:', this.baseUrl);
    console.log('Coze v2 payload:', JSON.stringify(payload));

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        Accept: '*/*'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Coze API v2 HTTP error: ${response.status}; raw=${JSON.stringify(data)}`);
    }

    const code = data?.code;
    if (typeof code !== 'undefined' && ![0, 200].includes(code)) {
      const detail = data?.detail ? JSON.stringify(data.detail) : '';
      throw new Error(`Coze API v2 business error: code=${code}; msg=${data?.msg || 'unknown'}; detail=${detail}`);
    }

    const answer = this._extractAnswer(data);
    if (!answer) {
      throw new Error(`Coze API v2 empty answer; raw=${JSON.stringify(data)}`);
    }
    return answer;
  }
}

module.exports = new AIService();
