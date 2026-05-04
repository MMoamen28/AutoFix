import axiosClient from './axiosClient';

export const repairOrderService = {
  getAll: () => axiosClient.get('/repairorders').then(r => r.data),
  getMyOrders: () => axiosClient.get('/repairorders/my').then(r => r.data),
  create: (dto: any) => axiosClient.post('/repairorders', dto).then(r => r.data),
  updateStatus: (id: number, status: string) => axiosClient.put(`/repairorders/${id}/status`, { status }).then(r => r.data),
};

export default repairOrderService;
