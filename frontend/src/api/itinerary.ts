import { request } from '@/utils/request';

// 获取行程列表
export function getItineraryList() {
  return request({
    url: '/itinerary',
    method: 'GET'
  });
}

// 生成行程
export function generateItinerary(data: any) {
  return request({
    url: '/itinerary/generate',
    method: 'POST',
    data
  });
}

// 保存行程
export function saveItinerary(data: any) {
  return request({
    url: '/itinerary',
    method: 'POST',
    data
  });
}

// 获取行程详情
export function getItineraryDetail(id: string | number) {
  return request({
    url: `/itinerary/${id}`,
    method: 'GET'
  });
}
