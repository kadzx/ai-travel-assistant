const { ChatMessage } = require('../models');
const cozeWorkflowService = require('./cozeWorkflowService');
const logger = require('../utils/logger');

class ChatService {
  /**
   * Start a new chat session
   * @param {Number} userId 
   * @returns {Promise<Object>} Session info
   */
  async startSession(userId) {
    const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    return { sessionId };
  }

  /**
   * 发送消息并通过 SSE 流式返回 AI 回复（仅此一种聊天方式）
   * @param {Number} userId
   * @param {String} sessionId
   * @param {String} content
   * @param {import('express').Response} res - 已设置 SSE 头的响应对象
   */
  async sendMessageStream(userId, sessionId, content, res) {
    try {
      await ChatMessage.create({
        user_id: userId,
        session_id: sessionId,
        role: 'user',
        content
      });

      const allHistory = await ChatMessage.findAll({
        where: { session_id: sessionId },
        order: [['createdAt', 'ASC']]
      });

      const messages = allHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const payload = { type: 'chat', messages };

      await cozeWorkflowService.streamWorkflowToResponse(payload, sessionId, res, async (parsed) => {
        try {
          await ChatMessage.create({
            user_id: userId,
            session_id: sessionId,
            role: 'assistant',
            content: parsed.content || ''
          });
        } catch (e) {
          logger.error('ChatService save assistant message error:', e);
        }
      });
    } catch (error) {
      logger.error('ChatService sendMessageStream error:', error);
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ code: 500, message: error.message || 'Stream failed' });
      }
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
