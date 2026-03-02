const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authMiddleware = require('../middlewares/authMiddleware');

// Public routes (Feed)
// But we might need optional auth to check isLiked
router.get('/', (req, res, next) => {
    // Try to authenticate but don't fail if no token
    const authHeader = req.headers.authorization;
    if (authHeader) {
        authMiddleware(req, res, next);
    } else {
        next();
    }
}, postController.getPosts);

router.get('/:id', (req, res, next) => {
    // Try to authenticate but don't fail if no token
    const authHeader = req.headers.authorization;
    if (authHeader) {
        authMiddleware(req, res, next);
    } else {
        next();
    }
}, postController.getPostById);

// Protected routes
router.post('/', authMiddleware, postController.createPost);
router.delete('/:id', authMiddleware, postController.deletePost);

module.exports = router;
