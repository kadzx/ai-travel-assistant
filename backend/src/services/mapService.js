const crypto = require('crypto');
const logger = require('../utils/logger');

const TENCENT_MAP_KEY = process.env.TENCENT_MAP_KEY || '';
const TENCENT_MAP_SK = process.env.TENCENT_MAP_SK || '';
const SEARCH_PATH = '/ws/place/v1/search';
const BASE_URL = 'https://apis.map.qq.com';

const MODE_PATHS = {
  driving: '/ws/direction/v1/driving/',
  walking: '/ws/direction/v1/walking/',
  bicycling: '/ws/direction/v1/bicycling/',
  transit: '/ws/direction/v1/transit/'
};

/**
 * 腾讯地图 polyline 前向差分解压
 */
function decompressPolyline(polyline) {
  const coors = [...polyline];
  for (let i = 2; i < coors.length; i++) {
    coors[i] = coors[i - 2] + coors[i] / 1000000;
  }
  const points = [];
  for (let i = 0; i < coors.length; i += 2) {
    points.push({ latitude: parseFloat(coors[i].toFixed(6)), longitude: parseFloat(coors[i + 1].toFixed(6)) });
  }
  return points;
}

class MapService {
  /**
   * 计算腾讯地图签名
   * sig = md5(请求路径?参数按key排序拼接 + SK)
   */
  _calcSig(path, params) {
    if (!TENCENT_MAP_SK) return '';
    const sortedKeys = Object.keys(params).sort();
    const queryStr = sortedKeys.map(k => `${k}=${params[k]}`).join('&');
    const raw = `${path}?${queryStr}${TENCENT_MAP_SK}`;
    return crypto.createHash('md5').update(raw).digest('hex');
  }

  /**
   * 根据关键词搜索地点，返回第一个结果的经纬度
   * @param {string} keyword - 地点名称，如 "西湖"
   * @param {string} region - 城市/区域，如 "杭州"
   * @returns {Promise<{lat: number, lng: number, address: string} | null>}
   */
  async searchLocation(keyword, region = '') {
    if (!TENCENT_MAP_KEY) {
      logger.warn('TENCENT_MAP_KEY not configured, skip location search');
      return null;
    }
    try {
      const params = {
        boundary: region ? `region(${region},0)` : 'region(全国,0)',
        key: TENCENT_MAP_KEY,
        keyword,
        page_index: '1',
        page_size: '1'
      };
      const sig = this._calcSig(SEARCH_PATH, params);
      if (sig) params.sig = sig;

      const qs = new URLSearchParams(params).toString();
      const response = await fetch(`${BASE_URL}${SEARCH_PATH}?${qs}`);
      const data = await response.json();
      if (data.status === 0 && data.data?.length > 0) {
        const place = data.data[0];
        return {
          lat: place.location.lat,
          lng: place.location.lng,
          address: place.address || ''
        };
      }
      return null;
    } catch (error) {
      logger.error('MapService searchLocation error:', error);
      return null;
    }
  }

  /**
   * 批量补全节点经纬度
   * @param {Array} nodes - 行程节点数组
   * @param {string} destination - 目的地城市
   * @returns {Promise<Array>} 补全后的节点数组
   */
  async enrichNodesWithCoords(nodes, destination = '') {
    const results = [];
    for (const node of nodes) {
      // 已有经纬度则跳过
      if (node.latitude && node.longitude) {
        results.push(node);
        continue;
      }
      // 无地点信息则跳过
      if (!node.location && !node.title) {
        results.push(node);
        continue;
      }
      const keyword = node.location || node.title;
      const geo = await this.searchLocation(keyword, destination);
      if (geo) {
        results.push({
          ...node,
          latitude: geo.lat,
          longitude: geo.lng,
          address: geo.address || node.address || ''
        });
      } else {
        results.push(node);
      }
    }
    return results;
  }

  /**
   * 路线规划
   * @param {number} fromLat 起点纬度
   * @param {number} fromLng 起点经度
   * @param {number} toLat 终点纬度
   * @param {number} toLng 终点经度
   * @param {string} mode 交通方式: driving/walking/bicycling/transit
   * @param {string} city 城市（公交模式需要）
   * @returns {Promise<{points: Array, distance: number, duration: number, steps: Array}>}
   */
  async planRoute(fromLat, fromLng, toLat, toLng, mode = 'driving', city = '') {
    if (!TENCENT_MAP_KEY) {
      throw new Error('TENCENT_MAP_KEY not configured');
    }
    const apiPath = MODE_PATHS[mode];
    if (!apiPath) {
      throw new Error(`Unsupported mode: ${mode}`);
    }

    try {
      const params = {
        from: `${fromLat},${fromLng}`,
        key: TENCENT_MAP_KEY,
        to: `${toLat},${toLng}`
      };
      // 公交模式需要城市参数
      if (mode === 'transit' && city) {
        params.departure_city = city;
        params.destination_city = city;
      }

      const sig = this._calcSig(apiPath, params);
      if (sig) params.sig = sig;

      const qs = new URLSearchParams(params).toString();
      const response = await fetch(`${BASE_URL}${apiPath}?${qs}`);
      const data = await response.json();

      if (data.status !== 0) {
        logger.warn('Route planning failed:', data.message);
        throw new Error(data.message || 'Route planning failed');
      }

      // 公交模式返回结构不同
      if (mode === 'transit') {
        return this._parseTransitResult(data.result);
      }

      const route = data.result.routes[0];
      if (!route) {
        throw new Error('No route found');
      }

      const points = decompressPolyline(route.polyline);
      const steps = (route.steps || []).map(s => ({
        instruction: s.instruction || '',
        distance: s.distance || 0,
        duration: s.duration || 0,
        road_name: s.road_name || ''
      }));

      return {
        points,
        distance: route.distance,
        duration: route.duration,
        steps
      };
    } catch (error) {
      logger.error('MapService planRoute error:', error);
      throw error;
    }
  }

  /**
   * 解析公交路线结果
   */
  _parseTransitResult(result) {
    const plan = result.routes?.[0];
    if (!plan) throw new Error('No transit route found');

    const allPoints = [];
    const steps = [];

    for (const step of (plan.steps || [])) {
      // step 可能是数组（多段换乘）或单个对象
      const segments = Array.isArray(step) ? step : [step];
      for (const s of segments) {
        if (s.polyline) {
          try {
            const pts = decompressPolyline(s.polyline);
            allPoints.push(...pts);
          } catch (e) {
            // 跳过解压失败的段
          }
        }
        const desc = s.instruction || s.lines?.[0]?.title;
        if (desc) {
          steps.push({
            instruction: s.instruction || `乘坐 ${s.lines?.[0]?.title || ''}`,
            distance: s.distance || 0,
            duration: s.duration || 0,
            road_name: s.lines?.[0]?.title || ''
          });
        }
      }
    }

    return {
      points: allPoints,
      distance: plan.distance || 0,
      duration: plan.duration || 0,
      steps
    };
  }
}

module.exports = new MapService();
