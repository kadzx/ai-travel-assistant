const express = require('express');
const router = express.Router();
const likeController = require('../controllers/likeController');
const commentController = require('../controllers/commentController');
const favoriteController = require('../controllers/favoriteController');
const authMiddleware = require('../middlewares/authMiddleware');

// All social routes require authentication
router.use(authMiddleware);

// --- Like Routes ---
router.post('/like', likeController.toggleLike);
router.get('/like/status', likeController.getLikeStatus);

// --- Comment Routes ---
router.post('/comment', commentController.createComment);
router.delete('/comment/:id', commentController.deleteComment);
router.get('/comments/:targetType/:targetId', commentController.getComments);

// --- Favorite Routes ---
router.post('/favorite', favoriteController.toggleFavorite);
router.get('/favorites', favoriteController.getFavorites);
router.post('/favorite/folder', favoriteController.createFolder);
router.get('/favorite/folders', favoriteController.getFolders);

module.exports = router;
