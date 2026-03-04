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
  location?: string;
  tags?: string[];
  type?: string;
  privacy?: string;
}

export interface GetPostsParams {
  page?: number;
  limit?: number;
  type?: string;
  feed?: 'recommend' | 'following';
  userId?: number | string;
  keyword?: string;
  tag?: string;
}

export const getPosts = (params: GetPostsParams) => {
  const p: Record<string, string | number> = {};
  if (params.page != null) p.page = params.page;
  if (params.limit != null) p.limit = params.limit;
  if (params.type) p.type = params.type;
  if (params.feed) p.feed = params.feed;
  if (params.userId != null) p.userId = params.userId;
  if (params.keyword) p.keyword = params.keyword;
  if (params.tag) p.tag = params.tag;
  return http.get('/posts', p);
};

export const getPostById = (id: number | string) => {
  return http.get(`/posts/${id}`);
};

export const createPost = (data: { 
  title: string; 
  content: string; 
  images: string[];
  location?: string;
  tags?: string[];
  type?: string;
  privacy?: string;
}) => {
  return http.post('/posts', data);
};

export const deletePost = (id: number | string) => {
  return http.delete(`/posts/${id}`);
};
