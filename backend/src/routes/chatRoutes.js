const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

router.post('/session', chatController.startSession);
router.post('/message', chatController.sendMessage);
router.get('/history/:sessionId', chatController.getHistory);

module.exports = router;
