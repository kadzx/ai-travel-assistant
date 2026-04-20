const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const favoriteController = require('../controllers/favoriteController');
const authMiddleware = require('../middlewares/authMiddleware');

// Like
router.post('/like', authMiddleware, socialController.toggleLike);

// Comment
router.post('/comment', authMiddleware, socialController.addComment);
router.get('/comments/:targetType/:targetId', socialController.getComments);
router.get('/comments/:commentId/replies', socialController.getReplies);

// Favorite（简单开关，无文件夹）
router.post('/favorite', authMiddleware, socialController.toggleFavorite);

// Report
router.post('/report', authMiddleware, socialController.submitReport);

// 收藏夹：创建文件夹、获取列表、按文件夹获取收藏
router.post('/favorite/folder', authMiddleware, favoriteController.createFolder);
router.get('/favorite/folders', authMiddleware, favoriteController.getFolders);
router.get('/favorites', authMiddleware, favoriteController.getFavorites);

module.exports = router;
