import axiosClient from './axiosClient';

export const serviceService = {
  getAll: (includeArchived?: boolean) => axiosClient.get('/services', { params: { includeArchived } }).then(r => r.data),
  getById: (id: number) => axiosClient.get(`/services/${id}`).then(r => r.data),
  create: (data: any) => axiosClient.post('/services', data).then(r => r.data),
  update: (id: number, data: any) => axiosClient.put(`/services/${id}`, data).then(r => r.data),
  delete: (id: number) => axiosClient.delete(`/services/${id}`).then(r => r.data),
  archive: (id: number) => axiosClient.delete(`/services/${id}`).then(r => r.data),
  restore: (id: number) => axiosClient.post(`/services/${id}/restore`).then(r => r.data),
};

export default serviceService;
