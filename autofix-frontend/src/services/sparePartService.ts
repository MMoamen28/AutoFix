import axiosClient from './axiosClient';
import axios from 'axios';

// Public axios instance — no auth header needed
const publicAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const sparePartService = {
  // Authenticated (Owner/Admin/Mechanic only)
  getAll: () => 
    axiosClient.get('/spareparts').then(r => r.data),
  
  getLowStock: () => 
    axiosClient.get('/spareparts/lowstock').then(r => r.data),
  
  create: (data: any) => 
    axiosClient.post('/spareparts', data).then(r => r.data),
  
  update: (id: number, data: any) => 
    axiosClient.put(`/spareparts/${id}`, data).then(r => r.data),
  
  adjustStock: (
    id: number, 
    adjustment: number, 
    reason: string = 'Manual adjustment'
  ) => axiosClient.patch(
    `/spareparts/${id}/stock`, 
    { adjustment, reason }
  ).then(r => r.data),

  delete: (id: number) => 
    axiosClient.delete(`/spareparts/${id}`).then(r => r.data),

  // Public — no auth needed — for the shared marketplace
  getMarketplace: () => 
    publicAxios.get('/spareparts/public-list').then(r => r.data),

  getMarketplaceByCategory: (categoryId: number) => 
    publicAxios.get(
      `/spareparts/public-list/category/${categoryId}`
    ).then(r => r.data),
};

export default sparePartService;
