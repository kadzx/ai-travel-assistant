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

// 更新整份行程
export function updateItinerary(id: string | number, data: any) {
  return request({
    url: `${BASE}/${id}`,
    method: 'PUT',
    data
  });
}

// 更新单个节点
export function updateItineraryNode(id: string | number, nodeId: string, data: any) {
  return request({
    url: `${BASE}/${id}/nodes/${nodeId}`,
    method: 'PATCH',
    data
  });
}

// 新增节点
export function addItineraryNode(id: string | number, data: any) {
  return request({
    url: `${BASE}/${id}/nodes`,
    method: 'POST',
    data
  });
}

// 删除节点
export function deleteItineraryNode(id: string | number, nodeId: string) {
  return request({
    url: `${BASE}/${id}/nodes/${nodeId}`,
    method: 'DELETE'
  });
}

// 删除整个行程
export function deleteItinerary(id: string | number) {
  return request({
    url: `${BASE}/${id}`,
    method: 'DELETE'
  });
}

// 节点重排
export function reorderItineraryNodes(id: string | number, orders: Array<{ nodeId: string; dayIndex: number; sequence: number }>) {
  return request({
    url: `${BASE}/${id}/nodes/reorder`,
    method: 'POST',
    data: { orders }
  });
}
