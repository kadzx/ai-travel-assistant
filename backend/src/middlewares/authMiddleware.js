const jwt = require('jsonwebtoken');
const { User } = require('../models');
const ResponseUtil = require('../utils/response');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseUtil.fail(res, 'auth_token_missing'); // Assuming 'auth_token_missing' exists or fallback
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return ResponseUtil.fail(res, 'auth_token_missing');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Check if user still exists
    const user = await User.findByPk(decoded.id);
    if (!user) {
      return ResponseUtil.fail(res, 'user_not_found');
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth Middleware Error:', error);
    if (error.name === 'TokenExpiredError') {
      return ResponseUtil.fail(res, 'auth_token_expired');
    }
    return ResponseUtil.fail(res, 'auth_token_invalid');
  }
};

module.exports = authMiddleware;
