import axiosClient from './axiosClient';

export interface Receipt {
  id: number;
  repairOrderId: number;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  carInfo: string;
  mechanicName: string;
  servicesPerformed: string[];
  totalCost: number;
  notes: string;
  issuedAt: string;
  isOwnerCopy: boolean;
  status: string;
}

const receiptService = {
  getAll: async (): Promise<Receipt[]> => {
    const response = await axiosClient.get('/receipts');
    return response.data;
  },

  getOwnerCopies: async (): Promise<Receipt[]> => {
    const response = await axiosClient.get('/receipts/owner-copies');
    return response.data;
  },

  getByCustomerId: async (customerId: number): Promise<Receipt[]> => {
    const response = await axiosClient.get(`/receipts/customer/${customerId}`);
    return response.data;
  },

  getById: async (id: number): Promise<Receipt> => {
    const response = await axiosClient.get(`/receipts/${id}`);
    return response.data;
  },

  voidReceipt: async (id: number): Promise<void> => {
    await axiosClient.patch(`/receipts/${id}/void`);
  },
};

export default receiptService;
