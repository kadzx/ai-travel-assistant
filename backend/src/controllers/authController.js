const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');
const authService = require('../services/authService');
const Joi = require('joi');

const registerSchema = Joi.object({
  username: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

exports.register = asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return ResponseUtil.fail(res, 'param_error', error.details[0].message);

  try {
    const data = await authService.register(value);
    ResponseUtil.success(res, data);
  } catch (err) {
    // If service throws specific error keys
    if (['user_exists'].includes(err.message)) {
      return ResponseUtil.fail(res, err.message);
    }
    throw err;
  }
});

exports.login = asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return ResponseUtil.fail(res, 'param_error', error.details[0].message);

  try {
    const data = await authService.login(value.email, value.password);
    ResponseUtil.success(res, data);
  } catch (err) {
    if (['user_not_found', 'password_error'].includes(err.message)) {
      return ResponseUtil.fail(res, err.message);
    }
    throw err;
  }
});
