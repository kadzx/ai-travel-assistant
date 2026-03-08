import http from '@/utils/request';

export interface NotificationItem {
  id: number;
  type: 'like' | 'comment' | 'follow';
  target_type: string | null;
  target_id: number | null;
  extra: { contentSnippet?: string; title?: string } | null;
  read_at: string | null;
  created_at: string;
  actor: {
    id: number;
    username: string;
    nickname?: string;
    avatar?: string;
  };
}

export const getNotifications = (params?: { page?: number; limit?: number; unreadOnly?: string }) => {
  return http.get<{ list: NotificationItem[]; total: number; page: number; totalPages: number }>(
    '/notifications',
    params as any
  );
};

export const getUnreadCount = () => {
  return http.get<{ count: number }>('/notifications/unread-count');
};

export const markNotificationRead = (id: number) => {
  return http.put(`/notifications/${id}/read`, {});
};

export const markAllRead = () => {
  return http.put('/notifications/read-all', {});
};
