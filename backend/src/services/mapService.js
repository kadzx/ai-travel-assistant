const crypto = require('crypto');
const logger = require('../utils/logger');

const TENCENT_MAP_KEY = process.env.TENCENT_MAP_KEY || '';
const TENCENT_MAP_SK = process.env.TENCENT_MAP_SK || '';
const SEARCH_PATH = '/ws/place/v1/search';
const GEOCODER_PATH = '/ws/geocoder/v1/';
const BASE_URL = 'https://apis.map.qq.com';

// 检测字符串是否主要为非中文字符
function isNonChinese(str) {
  if (!str) return false;
  const chineseChars = (str.match(/[\u4e00-\u9fff]/g) || []).length;
  return chineseChars < str.length * 0.3;
}

// 常见中国城市英文→中文映射（腾讯地图 region 参数只认中文）
const CITY_EN_TO_ZH = {
  'beijing': '北京', 'shanghai': '上海', 'guangzhou': '广州', 'shenzhen': '深圳',
  'chengdu': '成都', 'hangzhou': '杭州', 'nanjing': '南京', 'wuhan': '武汉',
  'xian': "西安", "xi'an": '西安', 'chongqing': '重庆', 'tianjin': '天津',
  'suzhou': '苏州', 'qingdao': '青岛', 'dalian': '大连', 'xiamen': '厦门',
  'kunming': '昆明', 'guilin': '桂林', 'lijiang': '丽江', 'lhasa': '拉萨',
  'harbin': '哈尔滨', 'sanya': '三亚', 'zhangjiajie': '张家界', 'huangshan': '黄山',
  'dali': '大理', 'chengde': '承德', 'luoyang': '洛阳', 'kaifeng': '开封',
  'pingyao': '平遥', 'dunhuang': '敦煌', 'urumqi': '乌鲁木齐', 'hohhot': '呼和浩特',
  'guiyang': '贵阳', 'nanning': '南宁', 'fuzhou': '福州', 'changsha': '长沙',
  'zhengzhou': '郑州', 'jinan': '济南', 'hefei': '合肥', 'nanchang': '南昌',
  'taiyuan': '太原', 'lanzhou': '兰州', 'xining': '西宁', 'yinchuan': '银川',
  'haikou': '海口', 'macau': '澳门', 'macao': '澳门', 'hong kong': '香港',
  'hongkong': '香港', 'taipei': '台北', 'zhuhai': '珠海', 'wuxi': '无锡',
  'ningbo': '宁波', 'dongguan': '东莞', 'foshan': '佛山', 'shenyang': '沈阳',
  'changchun': '长春', 'shijiazhuang': '石家庄', 'kunshan': '昆山',
};

/**
 * 将英文城市名转为中文（用于腾讯地图 region 参数）
 */
function regionToChinese(region) {
  if (!region || !isNonChinese(region)) return region;
  const key = region.trim().toLowerCase();
  return CITY_EN_TO_ZH[key] || region;
}

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
      // 腾讯地图 region 参数只认中文城市名，英文需要转换
      const zhRegion = regionToChinese(region);

      // 策略1: Place Search API（中文 region 约束）
      const result = await this._placeSearch(keyword, zhRegion);
      if (result) return result;

      // 策略2: 拼接 "城市 地点" 作为关键词，不限 region
      const combined = zhRegion && !keyword.includes(zhRegion)
        ? `${zhRegion} ${keyword}`
        : keyword;
      if (combined !== keyword) {
        const result2 = await this._placeSearch(combined, '');
        if (result2) return result2;
      }

      // 策略3: Geocoder API（地址解析，对完整地址支持更好）
      const geoResult = await this._geocode(combined);
      if (geoResult) return geoResult;

      return null;
    } catch (error) {
      logger.error('MapService searchLocation error:', error);
      return null;
    }
  }

  /**
   * 腾讯地图 Place Search
   */
  async _placeSearch(keyword, region = '') {
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
  }

  /**
   * 腾讯地图 Geocoder（地址解析），对英文/完整地址支持更好
   */
  async _geocode(address) {
    try {
      const params = {
        address,
        key: TENCENT_MAP_KEY
      };
      const sig = this._calcSig(GEOCODER_PATH, params);
      if (sig) params.sig = sig;

      const qs = new URLSearchParams(params).toString();
      const response = await fetch(`${BASE_URL}${GEOCODER_PATH}?${qs}`);
      const data = await response.json();
      if (data.status === 0 && data.result?.location) {
        return {
          lat: data.result.location.lat,
          lng: data.result.location.lng,
          address: data.result.title || data.result.address || ''
        };
      }
      return null;
    } catch (error) {
      logger.error('MapService _geocode error:', error);
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
    const CONCURRENCY = 5;
    const results = new Array(nodes.length);

    const enrichOne = async (node, index) => {
      if ((node.latitude && node.longitude) || (!node.location && !node.title)) {
        results[index] = node;
        return;
      }
      const keyword = node.location || node.title;
      const geo = await this.searchLocation(keyword, destination);
      if (geo) {
        results[index] = { ...node, latitude: geo.lat, longitude: geo.lng, address: geo.address || node.address || '' };
      } else {
        logger.warn(`[enrichNodesWithCoords] Failed to geocode: "${keyword}" in "${destination}"`);
        results[index] = node;
      }
    };

    for (let i = 0; i < nodes.length; i += CONCURRENCY) {
      const batch = nodes.slice(i, i + CONCURRENCY);
      await Promise.allSettled(batch.map((node, j) => enrichOne(node, i + j)));
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
