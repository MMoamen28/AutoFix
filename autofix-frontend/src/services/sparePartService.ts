import axiosClient from './axiosClient';

export const sparePartService = {
  getAll: () => axiosClient.get('/spareparts').then(r => r.data),
  getLowStock: () => axiosClient.get('/spareparts/low-stock').then(r => r.data),
  create: (data: any) => axiosClient.post('/spareparts', data).then(r => r.data),
  adjustStock: (id: number, quantity: number) => axiosClient.patch(`/spareparts/${id}/stock`, { quantity }).then(r => r.data),
};

export default sparePartService;
