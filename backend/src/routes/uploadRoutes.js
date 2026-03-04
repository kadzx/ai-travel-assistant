const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middlewares/authMiddleware');
const ResponseUtil = require('../utils/response');

const handleUploadError = (err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return ResponseUtil.fail(res, 'param_error', '文件不能超过 5MB');
  }
  next(err);
};

router.post('/', authMiddleware, uploadController.uploadMiddleware, handleUploadError, uploadController.uploadFile);

module.exports = router;
