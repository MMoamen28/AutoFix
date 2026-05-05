import axiosClient from './axiosClient';

export const repairOrderService = {
  getAll: () => 
    axiosClient.get('/repairorders').then(r => r.data),
  
  getMyOrders: () => 
    axiosClient.get('/repairorders/my').then(r => r.data),
  
  getAvailable: () => 
    axiosClient.get('/repairorders/available').then(r => r.data),
  
  getMyAssigned: () => 
    axiosClient.get('/repairorders/my-assigned').then(r => r.data),
  
  claimOrder: (id: number) => 
    axiosClient.patch(`/repairorders/${id}/claim`).then(r => r.data),
  
  create: (dto: any) => 
    axiosClient.post('/repairorders', dto).then(r => r.data),
  
  updateStatus: (id: number, status: string) => 
    axiosClient.put(`/repairorders/${id}`, { 
      status, 
      mechanicId: null, 
      notes: '' 
    }).then(r => r.data),
};

export default repairOrderService;
