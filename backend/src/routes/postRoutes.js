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
router.post('/', (req, res, next) => {
    // Ensure authentication before creating post
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ code: 401, msg: 'Unauthorized' });
    }
    authMiddleware(req, res, next);
}, postController.createPost);
router.delete('/:id', authMiddleware, postController.deletePost);
router.post('/:id/generate-itinerary', authMiddleware, postController.generateItinerary);

module.exports = router;
