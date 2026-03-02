const { ChatMessage } = require('../models');
const aiService = require('./aiService');
const logger = require('../utils/logger');
// const { v4: uuidv4 } = require('uuid'); // Removed to avoid dependency issues

class ChatService {
  /**
   * Start a new chat session
   * @param {Number} userId 
   * @returns {Promise<Object>} Session info
   */
  async startSession(userId) {
    // Generate a unique session ID
    // Simple random ID generator as fallback
    const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    return { sessionId };
  }

  /**
   * Send a message and get AI response
   * @param {Number} userId 
   * @param {String} sessionId 
   * @param {String} content 
   * @returns {Promise<Object>} AI response message
   */
  async sendMessage(userId, sessionId, content) {
    try {
      // 1. Save user message
      await ChatMessage.create({
        user_id: userId,
        session_id: sessionId,
        role: 'user',
        content
      });

      // 2. Retrieve history for context
      // Fetch all messages for this session to maintain context
      const allHistory = await ChatMessage.findAll({
        where: { session_id: sessionId },
        order: [['createdAt', 'ASC']]
      });

      const messages = allHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // 3. Call AI
      const aiResponseContent = await aiService.chat(messages);

      // 4. Save AI response
      const aiMessage = await ChatMessage.create({
        user_id: userId,
        session_id: sessionId,
        role: 'assistant',
        content: aiResponseContent
      });

      return aiMessage;
    } catch (error) {
      logger.error('ChatService sendMessage error:', error);
      throw error;
    }
  }

  /**
   * Get chat history
   * @param {Number} userId 
   * @param {String} sessionId 
   * @returns {Promise<Array<ChatMessage>>}
   */
  async getHistory(userId, sessionId) {
    try {
      return await ChatMessage.findAll({
        where: { user_id: userId, session_id: sessionId },
        order: [['createdAt', 'ASC']]
      });
    } catch (error) {
      logger.error('ChatService getHistory error:', error);
      throw error;
    }
  }
}

module.exports = new ChatService();
