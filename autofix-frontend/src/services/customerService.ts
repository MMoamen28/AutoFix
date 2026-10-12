import axiosClient from './axiosClient';

export const customerService = {
  getAllCustomers: async (includeArchived: boolean = false) => {
    const response = await axiosClient.get(`/customers?includeArchived=${includeArchived}`);
    return response.data;
  },
  getAll: async (includeArchived: boolean = false) => {
    const response = await axiosClient.get(`/customers?includeArchived=${includeArchived}`);
    return response.data;
  },
  searchCustomers: async (search: string, includeArchived: boolean = false) => {
    const response = await axiosClient.get(`/customers?search=${encodeURIComponent(search)}&includeArchived=${includeArchived}`);
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
  quickAdd: async (quickAddDto: any) => {
    const response = await axiosClient.post('/customers/quick-add', quickAddDto);
    return response.data;
  },
  updateCustomer: async (id: string | number, customerDto: any) => {
    const response = await axiosClient.put(`/customers/${id}`, customerDto);
    return response.data;
  },
  deleteCustomer: async (id: string | number) => {
    const response = await axiosClient.delete(`/customers/${id}`);
    return response.data;
  },
  archiveCustomer: async (id: string | number) => {
    const response = await axiosClient.post(`/customers/${id}/archive`);
    return response.data;
  },
  restoreCustomer: async (id: string | number) => {
    const response = await axiosClient.post(`/customers/${id}/restore`);
    return response.data;
  }
};

export default customerService;
