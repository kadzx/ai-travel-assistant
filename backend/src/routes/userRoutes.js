const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

// All user routes require authentication
router.use(authMiddleware);

// GET /api/user/profile
router.get('/profile', userController.getMyProfile);

// PUT /api/user/profile
router.put('/profile', userController.updateProfile);

// GET /api/user/activities
router.get('/activities', userController.getMyActivities);

module.exports = router;
