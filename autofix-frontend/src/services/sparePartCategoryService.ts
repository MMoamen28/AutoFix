import axiosClient from './axiosClient';

export const sparePartCategoryService = {
  getAll: async () => {
    const response = await axiosClient.get('/sparepartcategories');
    return response.data;
  },
  
  getById: async (id: number) => {
    const response = await axiosClient.get(`/sparepartcategories/${id}`);
    return response.data;
  },
  
  create: async (dto: { name: string }) => {
    const response = await axiosClient.post('/sparepartcategories', dto);
    return response.data;
  },
  
  delete: async (id: number) => {
    await axiosClient.delete(`/sparepartcategories/${id}`);
  }
};
