const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.apiToken = process.env.COZE_API_TOKEN;
    this.botId = process.env.COZE_BOT_ID;
    // Coze CN default endpoint
    this.baseUrl = process.env.COZE_API_BASE_URL || 'https://api.coze.cn/v3/chat';
  }

  /**
   * Generate itinerary based on preferences
   * @param {Object} params - { destination, days, budget, interests, travelers }
   * @returns {Promise<Object>} Generated itinerary JSON
   */
  async generateItinerary(params) {
    try {
      const { destination, days, budget, interests, travelers } = params;
      
      const prompt = `
        Please generate a detailed travel itinerary for ${destination}.
        Duration: ${days} days.
        Budget: ${budget}.
        Travelers: ${travelers}.
        Interests: ${interests}.
        
        The response must be a valid JSON object with the following structure:
        {
          "title": "Trip Title",
          "overview": "Brief overview of the trip",
          "days": [
            {
              "day": 1,
              "theme": "Day theme",
              "activities": [
                {
                  "time": "09:00",
                  "activity": "Activity description",
                  "location": "Location name",
                  "notes": "Tips or notes"
                }
              ]
            }
          ]
        }
        Do not include markdown formatting (like \`\`\`json). Just the raw JSON string.
      `;

      // Call Coze API
      const content = await this._callCozeAPI([{ role: 'user', content: prompt }]);
      
      // Attempt to clean markdown if present
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.error('AI Service Generate Itinerary Error:', error);
      throw error;
    }
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
   * Internal method to call Coze API (V2)
   * @param {Array} messages 
   * @returns {Promise<String>}
   */
  async _callCozeAPI(messages) {
    if (!this.apiToken || !this.botId) {
      throw new Error('COZE_API_TOKEN or COZE_BOT_ID is not configured');
    }

    // Use Coze V2 API for simple synchronous chat
    // Docs: https://www.coze.cn/docs/developer_guides/coze_api_v2_chat
    
    // Construct V2 Payload
    const v2Payload = {
        bot_id: this.botId,
        user: 'default_user', 
        query: messages[messages.length - 1].content,
        chat_history: messages.slice(0, -1).map(m => ({ 
            role: m.role, 
            content: m.content, 
            content_type: 'text' 
        })),
        stream: false
    };

    // Ensure we use V2 endpoint
    // If baseUrl contains 'v3', replace with 'open_api/v2/chat'
    // Or just hardcode/force V2 endpoint since we are constructing V2 payload
    let v2Url = this.baseUrl;
    if (v2Url.includes('/v3/')) {
        v2Url = v2Url.replace('/v3/', '/open_api/v2/');
    } else if (!v2Url.includes('open_api/v2/chat')) {
        // Fallback or just assume the user provided correct V2 URL if it doesn't match known patterns
        // But to be safe, let's just use the standard V2 URL if we are sure we want V2
        v2Url = 'https://api.coze.cn/open_api/v2/chat';
    }

    console.log('Calling Coze V2 API:', v2Url);
    // console.log('Payload:', JSON.stringify(v2Payload, null, 2)); // Debug log

    const response = await fetch(v2Url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Accept': '*/*'
        },
        body: JSON.stringify(v2Payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Coze API V2 Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.code !== 0) {
        throw new Error(`Coze API Error: ${data.msg}`);
    }

    // V2 response: { messages: [ { role: 'assistant', type: 'answer', content: '...' } ] }
    const answerMessage = data.messages.find(m => m.role === 'assistant' && m.type === 'answer');
    return answerMessage ? answerMessage.content : '';
  }
}

module.exports = new AIService();
