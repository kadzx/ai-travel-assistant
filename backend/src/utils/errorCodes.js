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
  
  // Business Specific
  spot_not_found: [2001, 'Scenic spot not found', '景点不存在']
};

module.exports = ErrorCodes;
