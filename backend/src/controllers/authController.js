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
  username: Joi.string(), // Allow username
  email: Joi.string().email(), // Allow email
  password: Joi.string().required()
}).xor('username', 'email'); // Require at least one of them

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
    const identifier = value.email || value.username;
    const data = await authService.login(identifier, value.password);
    ResponseUtil.success(res, data);
  } catch (err) {
    if (['user_not_found', 'password_error'].includes(err.message)) {
      return ResponseUtil.fail(res, err.message);
    }
    throw err;
  }
});

const forgotSchema = Joi.object({
  email: Joi.string().email().required()
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { error, value } = forgotSchema.validate(req.body);
  if (error) return ResponseUtil.fail(res, 'param_error', error.details[0].message);

  try {
    const data = await authService.verifyEmail(value.email);
    ResponseUtil.success(res, data);
  } catch (err) {
    if (err.message === 'user_not_found') return ResponseUtil.fail(res, 'user_not_found');
    throw err;
  }
});

const resetSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { error, value } = resetSchema.validate(req.body);
  if (error) return ResponseUtil.fail(res, 'param_error', error.details[0].message);

  try {
    const data = await authService.resetPassword(value.email, value.password);
    ResponseUtil.success(res, data);
  } catch (err) {
    if (err.message === 'user_not_found') return ResponseUtil.fail(res, 'user_not_found');
    throw err;
  }
});
