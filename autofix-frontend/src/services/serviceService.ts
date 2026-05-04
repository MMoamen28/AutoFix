import axiosClient from './axiosClient';

export const serviceService = {
  getAll: () => axiosClient.get('/services').then(r => r.data),
  create: (data: any) => axiosClient.post('/services', data).then(r => r.data),
};

export default serviceService;
