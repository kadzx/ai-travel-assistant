import http from '@/utils/request';

export interface SocialResponse {
  liked?: boolean;
  favorited?: boolean;
}

export const toggleLike = (data: { targetId: number | string; targetType: 'post' | 'comment' | 'scenic_spot' }) => {
  return http.post<SocialResponse>('/social/like', data);
};

export const toggleFavorite = (data: { targetId: number | string; targetType: 'post' | 'scenic_spot' }) => {
  return http.post<SocialResponse>('/social/favorite', data);
};

export const addComment = (data: {
  content: string;
  targetId: number | string;
  targetType: 'post' | 'comment' | 'scenic_spot';
  parentId?: number | string;
  replyToUserId?: number | string;
}) => {
  return http.post('/social/comment', data);
};

export const getComments = (targetType: string, targetId: number | string, params?: { page: number; limit: number }) => {
  return http.get(`/social/comments/${targetType}/${targetId}`, params);
};

export const getReplies = (commentId: number | string, params?: { page: number; limit: number }) => {
  return http.get(`/social/comments/${commentId}/replies`, params);
};

export const submitReport = (data: {
  targetId: number | string;
  targetType: 'post' | 'comment' | 'user';
  reason: string;
  description?: string;
}) => {
  return http.post('/social/report', data);
};
