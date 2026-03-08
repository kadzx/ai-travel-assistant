import { request } from '@/utils/request';

// 与后端路由一致：/api/itineraries
const BASE = '/itineraries';

// 获取行程列表
export function getItineraryList() {
  return request({
    url: BASE,
    method: 'GET'
  });
}

// 生成行程
export function generateItinerary(data: any) {
  return request({
    url: `${BASE}/generate`,
    method: 'POST',
    data
  });
}

// 保存行程
export function saveItinerary(data: any) {
  return request({
    url: BASE,
    method: 'POST',
    data
  });
}

// 获取行程详情
export function getItineraryDetail(id: string | number) {
  return request({
    url: `${BASE}/${id}`,
    method: 'GET'
  });
}
