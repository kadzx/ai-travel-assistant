const multer = require('multer');
const path = require('path');
const ResponseUtil = require('../utils/response');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads'); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

exports.uploadMiddleware = upload.single('file');

// 上传后返回 URL，前端将 URL 写入 users.avatar 存入数据库（头像等）
exports.uploadFile = (req, res) => {
  if (!req.file) {
    return ResponseUtil.fail(res, 'upload_error', 'No file uploaded');
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  ResponseUtil.success(res, { url: fileUrl });
};
