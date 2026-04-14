import http from '@/utils/request'

export const getDashboardStats = () => http.get('/dashboard')
