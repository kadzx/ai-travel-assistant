const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middlewares/authMiddleware');

// Protect upload
router.post('/', authMiddleware, uploadController.uploadMiddleware, uploadController.uploadFile);

module.exports = router;
