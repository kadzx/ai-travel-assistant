import { request } from '@/utils/request';

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  road_name: string;
}

export interface RouteResult {
  points: RoutePoint[];
  distance: number;
  duration: number;
  steps: RouteStep[];
}

export interface RouteSegment {
  distance: number;
  duration: number;
  points: RoutePoint[];
}

export type RouteMode = 'driving' | 'walking' | 'bicycling' | 'transit';

export function planRoute(data: {
  fromLat: number;
  fromLng: number;
  toKeyword?: string;
  toLat?: number;
  toLng?: number;
  mode: RouteMode;
  city?: string;
}) {
  return request<RouteResult>({
    url: '/map/route',
    method: 'POST',
    data
  });
}

export function getRouteBatch(data: {
  points: Array<{ lat: number; lng: number }>;
  mode?: RouteMode;
}) {
  return request<{ segments: RouteSegment[] }>({
    url: '/map/route-batch',
    method: 'POST',
    data
  });
}
