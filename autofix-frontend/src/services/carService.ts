import axiosClient from './axiosClient';

export const carService = {
  getAll: () => axiosClient.get('/cars').then(r => r.data),
  create: (dto: any) => axiosClient.post('/cars', dto).then(r => r.data),
};

export default carService;
