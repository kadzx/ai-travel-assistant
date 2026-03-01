const OpenAI = require('openai');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1' // Support custom base URL
    });
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

      const completion = await this.openai.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content;
      return JSON.parse(content);
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
      const completion = await this.openai.chat.completions.create({
        messages: messages,
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('AI Service Chat Error:', error);
      throw error;
    }
  }
}

module.exports = new AIService();
