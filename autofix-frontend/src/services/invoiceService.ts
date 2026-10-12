import axiosClient from './axiosClient';

export interface InvoiceLineSnapshot {
  LineType: string;
  Description: string;
  ServiceId?: number;
  Quantity: number;
  UnitPrice: number;
  UnitCost?: number;
  Subtotal: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  workOrderId?: number;
  customerId: number;
  customerName: string;
  customerPhone?: string;
  carId: number;
  carPlate?: string;
  carMakeModel?: string;
  subtotal: number;
  discountAmount: number;
  vatPercentage: number;
  vatAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  currency: string;
  issuedAt: string;
  dueDate?: string;
  notes?: string;
  snapshotDetailsJson?: string;
  totalWorkmanship?: number;
  totalLabor?: number;
  totalParts?: number;
  payments?: any[];
}

export const invoiceService = {
  getAll: (customerId?: number) => 
    axiosClient.get<Invoice[]>('/invoices', { params: { customerId } }).then(r => r.data),
  
  getById: (id: number) => 
    axiosClient.get<Invoice>(`/invoices/${id}`).then(r => r.data),
  
  recordPayment: (id: number, data: { amount: number; paymentMethod: string; referenceNumber?: string; notes?: string }) => 
    axiosClient.post(`/invoices/${id}/payments`, data).then(r => r.data),
  
  getPrintUrl: (id: number) => `/api/invoices/${id}/print`,
  
  delete: (id: number) => 
    axiosClient.delete(`/invoices/${id}`).then(r => r.data)
};

export default invoiceService;
