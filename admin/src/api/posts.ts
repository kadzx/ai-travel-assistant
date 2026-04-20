import http from '@/utils/request'

export const getPosts = (params: any) => http.get('/posts', { params })
export const deletePost = (id: number) => http.delete(`/posts/${id}`)
