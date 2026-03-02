const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const authMiddleware = require('../middlewares/authMiddleware');

// Like
router.post('/like', authMiddleware, socialController.toggleLike);

// Comment
router.post('/comment', authMiddleware, socialController.addComment);
router.get('/comments/:targetType/:targetId', socialController.getComments); // Public read

// Favorite
router.post('/favorite', authMiddleware, socialController.toggleFavorite);

module.exports = router;
