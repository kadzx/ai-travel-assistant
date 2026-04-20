import http from '@/utils/request';

export function followUser(userId: number | string) {
  return http.post('/follow', { userId: String(userId) });
}

export function unfollowUser(userId: number | string) {
  return http.post('/follow/unfollow', { userId: String(userId) });
}

export function checkFollow(userId: number | string) {
  return http.get('/follow/check', { userId: Number(userId) });
}

export function getFollowingList(params?: { page?: number; limit?: number }) {
  return http.get('/follow/following', params);
}

export function getFollowersList(params?: { page?: number; limit?: number }) {
  return http.get('/follow/followers', params);
}
