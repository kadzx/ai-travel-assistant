/**
 * Async Handler Wrapper / 异步错误捕获包装器
 * Eliminates try-catch blocks in controllers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
