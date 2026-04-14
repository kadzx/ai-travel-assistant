import http from '@/utils/request';
import { sseRequest } from '@/utils/sse';

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
  latitude?: number;
  longitude?: number;
  address?: string;
  tags?: string[];
  type?: string;
  privacy?: string;
  lang?: string;
}

export interface GetPostsParams {
  page?: number;
  limit?: number;
  type?: string;
  feed?: 'recommend' | 'following';
  userId?: number | string;
  keyword?: string;
  tag?: string;
  lang?: string;
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
  if (params.lang) p.lang = params.lang;
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
  latitude?: number;
  longitude?: number;
  address?: string;
  tags?: string[];
  type?: string;
  privacy?: string;
  lang?: string;
}) => {
  return http.post('/posts', data);
};

export const deletePost = (id: number | string) => {
  return http.delete(`/posts/${id}`);
};

export interface GenerateItineraryDonePayload {
  content: string;
  thinking?: string;
  itineraries: boolean;
  itineraryData?: any;
  rawOutput?: string;
}

export function generateItineraryFromPost(
  postId: number | string,
  onChunk: (chunkText: string) => void,
  onDone: (payload: GenerateItineraryDonePayload) => void,
  onContent?: (content: string) => void,
  onThinking?: (thinkingText: string) => void,
  onError?: (err: any) => void
): void {
  sseRequest(`/posts/${postId}/generate-itinerary`, {}, {
    onChunk,
    onDone,
    onContent,
    onThinking,
    onError,
  });
}
