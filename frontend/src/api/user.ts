import http from '@/utils/request';
import { withCache, clearCache } from '@/utils/cache';

export interface PublicProfile {
  id: number;
  username: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  created_at: string;
  stats: {
    postCount: number;
    followerCount: number;
    followingCount: number;
    receivedLikesCount: number;
  };
  isFollowing?: boolean;
}

export function getPublicProfile(userId: number | string) {
  return withCache(
    `user:profile:${userId}`,
    () => http.get<PublicProfile>(`/user/${userId}`),
    2 * 60 * 1000
  );
}

export function invalidateUserCache(userId?: number | string) {
  clearCache(userId ? `user:profile:${userId}` : 'user:profile:');
}
