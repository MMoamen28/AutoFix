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

export interface InvoicePayment {
  id: number;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  paidAt: string;
  receivedBy?: string;
  notes?: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  workOrderId?: number;
  workOrderNumber?: string;
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
  status: string; // Issued, Paid, PartiallyPaid, Credited, Cancelled
  currency: string;
  issuedAt: string;
  dueDate?: string;
  notes?: string;
  snapshotDetailsJson?: string;
  totalWorkmanship?: number;
  totalLabor?: number;
  totalParts?: number;
  payments?: InvoicePayment[];
}

export interface CreditNote {
  id: number;
  creditNoteNumber: string;
  invoiceId: number;
  invoiceNumber: string;
  workOrderId?: number;
  workOrderNumber?: string;
  customerId: number;
  customerName: string;
  customerPhone?: string;
  carPlate?: string;
  carMakeModel?: string;
  invoiceTotal: number;
  amountRefunded: number;
  stockRestored: boolean;
  reason: string;
  issuedBy: string;
  issuedAt: string;
  notes?: string;
}

export const invoiceService = {
  getAll: (customerId?: number) => 
    axiosClient.get<Invoice[]>('/invoices', { params: { customerId } }).then(r => r.data),
  
  getById: (id: number) => 
    axiosClient.get<Invoice>(`/invoices/${id}`).then(r => r.data),
  
  recordPayment: (id: number, data: { amount: number; paymentMethod: string; referenceNumber?: string; notes?: string }) => 
    axiosClient.post<InvoicePayment>(`/invoices/${id}/payments`, data).then(r => r.data),

  creditInvoice: (id: number, reason: string) =>
    axiosClient.post<Invoice>(`/invoices/${id}/credit`, { reason }).then(r => r.data),

  getAllCreditNotes: (customerId?: number) =>
    axiosClient.get<CreditNote[]>('/credit-notes', { params: { customerId } }).then(r => r.data),
  
  getPrintHtml: (id: number) => 
    axiosClient.get<string>(`/invoices/${id}/print`, { responseType: 'text' as any }).then(r => r.data),
  
  getPreviewHtml: (id: number) => 
    axiosClient.get<string>(`/invoices/${id}/preview`, { responseType: 'text' as any }).then(r => r.data),

  getPrintUrl: (id: number) => `/api/invoices/${id}/print`,

  updateInvoiceNumber: (id: number, newInvoiceNumber: string, reason?: string) =>
    axiosClient.put<Invoice>(`/invoices/${id}/number`, { newInvoiceNumber, reason }).then(r => r.data),

  updateInvoiceDate: (id: number, newIssuedAt: string, reason?: string) =>
    axiosClient.put<Invoice>(`/invoices/${id}/date`, { newIssuedAt, reason }).then(r => r.data),
  
  delete: (id: number) => 
    axiosClient.delete(`/invoices/${id}`).then(r => r.data)
};

export default invoiceService;
