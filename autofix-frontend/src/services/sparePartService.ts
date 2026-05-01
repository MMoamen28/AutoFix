import axiosClient from './axiosClient';

export const sparePartService = {
  getAll: () => axiosClient.get('/spareparts').then(r => r.data),
  adjustStock: (id: number, quantity: number) => axiosClient.patch(`/spareparts/${id}/stock`, { quantity }).then(r => r.data),
};

export default sparePartService;
