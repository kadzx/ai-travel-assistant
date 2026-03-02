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
    // If running in mock/dev mode without real keys, return mock response
    if (this.apiToken === 'mock_token') {
      return `[MOCK AI] I received your message: "${messages[messages.length - 1].content}". This is a simulated response because COZE_API_TOKEN is not configured.`;
    }

    if (!this.apiToken || !this.botId) {
      throw new Error('COZE_API_TOKEN or COZE_BOT_ID is not configured');
    }

    // Use Coze V3 API for chat
    // Docs: https://www.coze.cn/docs/developer_guides/chat_v3
    
    // Construct V3 Payload
    const v3Payload = {
        bot_id: this.botId,
        user_id: 'default_user', 
        additional_messages: messages.map(m => ({ 
            role: m.role, 
            content: m.content, 
            content_type: 'text' 
        })),
        stream: false
    };

    let v3Url = 'https://api.coze.cn/v3/chat';

    console.log('Calling Coze V3 API:', v3Url);

    const response = await fetch(v3Url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
            'Accept': '*/*'
        },
        body: JSON.stringify(v3Payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Coze API V3 Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.code !== 0) {
        throw new Error(`Coze API Error: ${data.msg}`);
    }

    // V3 response: { data: { status: 'completed', ... } }
    // Need to poll or wait if not stream? No, for non-stream, it might return initial status.
    // Actually V3 non-stream returns the chat object immediately, but status might be created/in_progress.
    // Wait, Coze V3 non-stream chat API returns the chat status. We might need to poll for completion if it's async?
    // Let's check V3 docs carefully. V3 Chat is async.
    // However, for simplicity and compatibility with previous synchronous expectation, let's use the V3 "Chat" endpoint which initiates.
    // AND then we need to Retrieve Messages.
    
    // Simplification: Let's stick to V3 but we need to handle the async nature properly or check if there's a synchronous flag.
    // Actually, to make it simple and robust given the short time, let's use the `stream=false` and hope it returns result or we poll.
    // Wait, if V3 is complex (requires polling), maybe V2 (OpenAPI) is better for simple "request-response"?
    // The user provided a "sat_" token which works with V3.
    // Let's try to implement a simple polling mechanism for V3.
    
    const chatId = data.data.id;
    const conversationId = data.data.conversation_id;
    
    // Poll for completion
    let status = data.data.status;
    let attempts = 0;
    while (status === 'in_progress' || status === 'created') {
        if (attempts > 30) throw new Error('Coze API Timeout');
        await new Promise(r => setTimeout(r, 1000));
        
        const checkUrl = `https://api.coze.cn/v3/chat/retrieve?chat_id=${chatId}&conversation_id=${conversationId}`;
        const checkRes = await fetch(checkUrl, {
             headers: { 'Authorization': `Bearer ${this.apiToken}` }
        });
        const checkData = await checkRes.json();
        status = checkData.data.status;
        attempts++;
    }
    
    if (status === 'completed') {
        // Fetch messages
        const msgUrl = `https://api.coze.cn/v3/chat/message/list?chat_id=${chatId}&conversation_id=${conversationId}`;
        const msgRes = await fetch(msgUrl, {
             headers: { 'Authorization': `Bearer ${this.apiToken}` }
        });
        const msgData = await msgRes.json();
        
        // Filter for assistant answer
        const assistantMsgs = msgData.data.filter(m => m.role === 'assistant' && m.type === 'answer');
        // Get the last one
        return assistantMsgs.length > 0 ? assistantMsgs[assistantMsgs.length - 1].content : '';
    } else {
        throw new Error(`Coze API Chat Failed with status: ${status}`);
    }
  }
}

module.exports = new AIService();
