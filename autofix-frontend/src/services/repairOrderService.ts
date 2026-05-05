import axiosClient from './axiosClient';

export const repairOrderService = {
  getAll: () => axiosClient.get('/repairorders').then(r => r.data),
  getMyOrders: () => axiosClient.get('/repairorders/my').then(r => r.data),
  getAssignedOrders: () => axiosClient.get('/repairorders/assigned').then(r => r.data),
  create: (dto: any) => axiosClient.post('/repairorders', dto).then(r => r.data),
  update: (id: number, dto: any) => axiosClient.put(`/repairorders/${id}`, dto).then(r => r.data),
  updateStatus: (id: number, status: string) => axiosClient.patch(`/repairorders/${id}/status`, { status }).then(r => r.data),
};

export default repairOrderService;
