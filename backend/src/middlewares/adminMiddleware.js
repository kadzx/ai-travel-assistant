const ResponseUtil = require('../utils/response');

const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    // 403 Forbidden
    return ResponseUtil.fail(res, 'forbidden');
  }
};

module.exports = adminMiddleware;
