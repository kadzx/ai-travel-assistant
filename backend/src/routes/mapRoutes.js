const express = require('express');
const router = express.Router();
const mapService = require('../services/mapService');
const asyncHandler = require('../middlewares/asyncHandler');
const ResponseUtil = require('../utils/response');

// POST /api/map/route — 路线规划
router.post('/route', asyncHandler(async (req, res) => {
  const { fromLat, fromLng, toKeyword, toLat, toLng, mode = 'driving', city = '' } = req.body;

  if (!fromLat || !fromLng) {
    return ResponseUtil.error(res, '缺少起点坐标', 400);
  }
  if (!toLat && !toLng && !toKeyword) {
    return ResponseUtil.error(res, '缺少终点信息', 400);
  }

  let destLat = toLat;
  let destLng = toLng;

  // 如果没有终点坐标，用关键字搜索
  if (!destLat || !destLng) {
    const geo = await mapService.searchLocation(toKeyword, city);
    if (!geo) {
      return ResponseUtil.error(res, `无法找到地点: ${toKeyword}`, 404);
    }
    destLat = geo.lat;
    destLng = geo.lng;
  }

  const result = await mapService.planRoute(fromLat, fromLng, destLat, destLng, mode, city);
  return ResponseUtil.success(res, result);
}));

module.exports = router;
