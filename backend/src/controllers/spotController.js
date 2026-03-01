const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');
const spotService = require('../services/spotService');
const Joi = require('joi');

const spotSchema = Joi.object({
  name_en: Joi.string().required(),
  name_zh: Joi.string().required(),
  description_en: Joi.string(),
  description_zh: Joi.string(),
  location_en: Joi.string(),
  location_zh: Joi.string(),
  price: Joi.number().min(0)
});

exports.createSpot = asyncHandler(async (req, res) => {
  const { error, value } = spotSchema.validate(req.body);
  if (error) return ResponseUtil.fail(res, 'param_error', error.details[0].message);

  const spot = await spotService.create(value);
  ResponseUtil.success(res, spot);
});

exports.getSpots = asyncHandler(async (req, res) => {
  const result = await spotService.findAll(req.query);
  ResponseUtil.success(res, result);
});

exports.getSpotById = asyncHandler(async (req, res) => {
  try {
    const spot = await spotService.findById(req.params.id);
    ResponseUtil.success(res, spot);
  } catch (err) {
    if (err.message === 'spot_not_found') {
      return ResponseUtil.fail(res, 'spot_not_found');
    }
    throw err;
  }
});
