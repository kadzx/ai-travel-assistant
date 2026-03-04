const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// Authenticated routes first (so /profile and /activities don't match as /:id)
router.get('/profile', authMiddleware, userController.getMyProfile);
router.put('/profile', authMiddleware, userController.updateProfile);
router.get('/activities', authMiddleware, userController.getMyActivities);

// Public profile: GET /api/user/:id (optional auth for isFollowing)
router.get('/:id', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    return authMiddleware(req, res, next);
  }
  next();
}, userController.getPublicProfile);

module.exports = router;
