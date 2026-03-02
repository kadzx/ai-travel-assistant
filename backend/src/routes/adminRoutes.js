const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// All routes require login and admin role / 所有路由需要登录和管理员权限
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard / 仪表盘
router.get('/dashboard', adminController.getDashboardStats);

// User Management / 用户管理
router.get('/users', adminController.getUsers);
router.put('/users/:id/status', adminController.updateUserStatus);

// Content Management - Posts / 内容管理 - 帖子
router.get('/posts', adminController.getPosts);
router.delete('/posts/:id', adminController.deletePost);

// Content Management - Comments / 内容管理 - 评论
router.get('/comments', adminController.getComments);
router.delete('/comments/:id', adminController.deleteComment);

module.exports = router;
