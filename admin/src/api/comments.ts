import http from '@/utils/request'

export const getComments = (params: any) => http.get('/comments', { params })
export const deleteComment = (id: number) => http.delete(`/comments/${id}`)
