// Bilingual Error Codes / 双语错误码
// Format: [CODE, EN_MSG, CN_MSG]

const ErrorCodes = {
  SUCCESS: [0, 'Success', '操作成功'],
  server_error: [5000, 'Internal Server Error', '服务器内部错误'],
  param_error: [4000, 'Invalid Parameters', '参数错误'],
  unauthorized: [4001, 'Unauthorized', '未授权'],
  forbidden: [4003, 'Forbidden', '禁止访问'],
  not_found: [4004, 'Resource Not Found', '资源不存在'],
  
  // Auth Specific
  user_exists: [1001, 'User already exists', '用户已存在'],
  user_not_found: [1002, 'User not found', '用户不存在'],
  password_error: [1003, 'Incorrect password', '密码错误'],
  auth_token_missing: [4001, 'Token missing', '缺少访问令牌'],
  auth_token_expired: [4001, 'Token expired', '令牌已过期'],
  auth_token_invalid: [4001, 'Invalid token', '无效的令牌'],
  
  // Business Specific
  spot_not_found: [2001, 'Scenic spot not found', '景点不存在'],
  post_not_found: [2002, 'Post not found', '帖子不存在'],
  upload_error: [2003, 'Upload error', '上传失败'],
  permission_denied: [4003, 'Permission denied', '无权限操作']
};

module.exports = ErrorCodes;
