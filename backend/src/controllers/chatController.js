const chatService = require('../services/chatService');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');

const chatController = {
  // POST /session
  startSession: asyncHandler(async (req, res) => {
    const result = await chatService.startSession(req.user.id);
    return ResponseUtil.success(res, result);
  }),

  // POST /message — 仅 SSE 流式返回，无普通 JSON 响应
  sendMessage: async (req, res) => {
    const { sessionId, content } = req.body;
    if (!sessionId || !content) {
      return ResponseUtil.fail(res, 'params_error', 'Session ID and content are required');
    }
    await chatService.sendMessageStream(req.user.id, sessionId, content, res);
  },

  // GET /history/:sessionId
  getHistory: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    if (!sessionId) {
      return ResponseUtil.fail(res, 'params_error', 'Session ID is required');
    }
    const history = await chatService.getHistory(req.user.id, sessionId);
    return ResponseUtil.success(res, history);
  })
};

module.exports = chatController;
