const ErrorCodes = require('./errorCodes');

/**
 * Standard API Response Structure / 标准API响应结构
 * {
 *   code: Number,
 *   msg: String,
 *   data: Any,
 *   debug: Any (optional)
 * }
 */
class ResponseUtil {
  static success(res, data = null) {
    const [code, enMsg, cnMsg] = ErrorCodes.SUCCESS;
    const lang = res.req.lang || 'zh';
    return res.status(200).json({
      code,
      msg: lang === 'en' ? enMsg : cnMsg,
      data
    });
  }

  static fail(res, errorKey, debugInfo = null) {
    const [code, enMsg, cnMsg] = ErrorCodes[errorKey] || ErrorCodes.server_error;
    const lang = res.req.lang || 'zh';
    
    const response = {
      code,
      msg: lang === 'en' ? enMsg : cnMsg,
      data: null
    };

    if (process.env.NODE_ENV === 'development' && debugInfo) {
      response.debug = debugInfo;
    }

    // Map specific error codes to HTTP status if needed, defaulting to 200 (soft error) or specific status
    let status = 200;
    if (code >= 4000 && code < 5000) status = 400; // Simplified logic
    if (code === 5000) status = 500;
    if (code === 4001) status = 401;
    if (code === 4003) status = 403;
    if (code === 4004) status = 404;

    return res.status(status).json(response);
  }
}

module.exports = ResponseUtil;
