import http from '@/utils/request';

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
  return http.get<PublicProfile>(`/user/${userId}`);
}
