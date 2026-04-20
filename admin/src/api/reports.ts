import http from '@/utils/request'

export const getReports = (params: any) => http.get('/reports', { params })
export const updateReport = (id: number, data: any) => http.put(`/reports/${id}`, data)
