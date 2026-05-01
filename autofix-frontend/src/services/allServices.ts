import axiosClient from './axiosClient';

export const mechanicService = {
  getAll: () => axiosClient.get('/mechanics').then(r => r.data),
  create: (dto: any) => axiosClient.post('/mechanics', dto).then(r => r.data),
};

export const carService = {
  getAll: () => axiosClient.get('/cars').then(r => r.data),
  create: (dto: any) => axiosClient.post('/cars', dto).then(r => r.data),
};

export const repairOrderService = {
  getAll: () => axiosClient.get('/repairorders').then(r => r.data),
  create: (dto: any) => axiosClient.post('/repairorders', dto).then(r => r.data),
  updateStatus: (id: number, status: string) => axiosClient.put(`/repairorders/${id}/status`, { status }).then(r => r.data),
};

export const serviceService = {
  getAll: () => axiosClient.get('/services').then(r => r.data),
};

export const sparePartService = {
  getAll: () => axiosClient.get('/spareparts').then(r => r.data),
  adjustStock: (id: number, quantity: number) => axiosClient.patch(`/spareparts/${id}/stock`, { quantity }).then(r => r.data),
};

export const sparePartCategoryService = {
  getAll: () => axiosClient.get('/sparepartcategories').then(r => r.data),
};
