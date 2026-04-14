import http from '@/utils/request'

export const getUsers = (params: any) => http.get('/users', { params })
export const updateUserStatus = (id: number, data: any) => http.put(`/users/${id}/status`, data)
