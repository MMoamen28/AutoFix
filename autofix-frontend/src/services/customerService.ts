import axiosClient from './axiosClient';

export const customerService = {
  getAllCustomers: async () => {
    const response = await axiosClient.get('/customers');
    return response.data;
  },
  getAll: async () => {
    const response = await axiosClient.get('/customers');
    return response.data;
  },
  getCustomerById: async (id: string | number) => {
    const response = await axiosClient.get(`/customers/${id}`);
    return response.data;
  },
  createCustomer: async (customerDto: any) => {
    const response = await axiosClient.post('/customers', customerDto);
    return response.data;
  },
  updateCustomer: async (id: string | number, customerDto: any) => {
    const response = await axiosClient.put(`/customers/${id}`, customerDto);
    return response.data;
  },
  deleteCustomer: async (id: string | number) => {
    const response = await axiosClient.delete(`/customers/${id}`);
    return response.data;
  }
};

export default customerService;
