import http from '@/utils/request';

export interface Post {
  id: number;
  title: string;
  content: string;
  images: string[];
  user_id: number;
  user: {
    id: number;
    username: string;
    avatar: string;
    nickname: string;
  };
  likes: number;
  comments: number;
  isLiked: boolean;
  created_at: string;
}

export const getPosts = (params: { page: number; limit: number }) => {
  return http.get('/posts', params);
};

export const getPostById = (id: number | string) => {
  return http.get(`/posts/${id}`);
};

export const createPost = (data: { title: string; content: string; images: string[] }) => {
  return http.post('/posts', data);
};

export const deletePost = (id: number | string) => {
  return http.delete(`/posts/${id}`);
};
