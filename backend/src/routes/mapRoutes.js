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

// POST /api/map/route-batch — 批量路线规划（相邻点对，并行请求）
router.post('/route-batch', asyncHandler(async (req, res) => {
  const { points, mode = 'walking' } = req.body;

  if (!Array.isArray(points) || points.length < 2) {
    return ResponseUtil.error(res, '至少需要2个坐标点', 400);
  }

  // 并行请求所有段
  const promises = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    if (!from.lat || !from.lng || !to.lat || !to.lng) {
      promises.push(Promise.resolve({ distance: 0, duration: 0, points: [] }));
      continue;
    }
    promises.push(
      mapService.planRoute(from.lat, from.lng, to.lat, to.lng, mode, '')
        .then(result => ({
          distance: result.distance || 0,
          duration: result.duration || 0,
          points: result.points || []
        }))
        .catch(() => ({
          distance: 0,
          duration: 0,
          points: [
            { latitude: from.lat, longitude: from.lng },
            { latitude: to.lat, longitude: to.lng }
          ]
        }))
    );
  }

  const segments = await Promise.all(promises);
  return ResponseUtil.success(res, { segments });
}));

module.exports = router;
