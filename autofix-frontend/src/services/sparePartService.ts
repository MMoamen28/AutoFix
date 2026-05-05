import axiosClient from './axiosClient';
import axios from 'axios';

const publicAxios = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const sparePartService = {
  getAll: () =>
    axiosClient.get('/spareparts').then(r => r.data),

  getLowStock: () =>
    axiosClient.get('/spareparts/lowstock').then(r => r.data),

  getById: (id: number) =>
    axiosClient.get(`/spareparts/${id}`).then(r => r.data),

  create: (data: {
    categoryId: number;
    name: string;
    partNumber: string;
    brand?: string;
    description?: string;
    unitPrice: number;
    stockQuantity: number;
    minimumStockLevel: number;
  }) => axiosClient.post('/spareparts', data).then(r => r.data),

  update: (id: number, data: any) =>
    axiosClient.put(`/spareparts/${id}`, data).then(r => r.data),

  adjustStock: (
    id: number,
    adjustment: number,
    reason: string = 'Manual adjustment'
  ) =>
    axiosClient
      .patch(`/spareparts/${id}/stock`, { adjustment, reason })
      .then(r => r.data),

  delete: (id: number) =>
    axiosClient.delete(`/spareparts/${id}`).then(r => r.data),

  getMarketplace: () =>
    publicAxios.get('/spareparts/public-list').then(r => r.data),

  getMarketplaceByCategory: (categoryId: number) =>
    publicAxios
      .get(`/spareparts/public-list/category/${categoryId}`)
      .then(r => r.data),
};

export default sparePartService;
