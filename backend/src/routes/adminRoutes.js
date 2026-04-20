const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/dashboard', adminController.getDashboardStats);

router.get('/users', adminController.getUsers);
router.put('/users/:id/status', adminController.updateUserStatus);

router.get('/posts', adminController.getPosts);
router.delete('/posts/:id', adminController.deletePost);

router.get('/comments', adminController.getComments);
router.delete('/comments/:id', adminController.deleteComment);

router.get('/reports', adminController.getReports);
router.put('/reports/:id', adminController.updateReport);

module.exports = router;
