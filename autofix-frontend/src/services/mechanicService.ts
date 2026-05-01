import axiosClient from './axiosClient';

export const mechanicService = {
  getAll: () => axiosClient.get('/mechanics').then(r => r.data),
  create: (dto: any) => axiosClient.post('/mechanics', dto).then(r => r.data),
};

export default mechanicService;
