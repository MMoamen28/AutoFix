import api from './axiosClient';

export interface InspectionRevision {
  id: number;
  reportNumber: string;
  revisionNumber: number;
  inspectedAt: string;
  status: string;
  isCurrentRevision: boolean;
}

export interface Inspection {
  id: number;
  reportNumber: string;
  customerId?: number;
  customerName: string;
  customerPhone: string;
  carId?: number;
  carPlate: string;
  carChassis: string;
  carMake: string;
  carModel: string;
  carYear: number;
  odometerKm: number;
  workOrderId?: number;
  workOrderNumber?: string;
  invoiceId?: number;
  invoiceNumber?: string;
  invoiceAmount?: number;
  status: string; // Draft, Final
  revisionNumber: number;
  previousRevisionId?: number;
  isCurrentRevision: boolean;
  finalizedAt?: string;
  checklistDataJson: string;
  damageMarkersJson: string;
  diagnosticScanResult?: string;
  pdfFilePath?: string;
  overallScore: number;
  generalVerdict: string;
  notes: string;
  inspectedAt: string;
  inspectedByMechanicName?: string;
  revisions: InspectionRevision[];
}

export const inspectionService = {
  getAll: async (customerId?: number) => {
    const params = customerId ? `?customerId=${customerId}` : '';
    const res = await api.get<Inspection[]>(`/Inspections${params}`);
    return res.data;
  },

  getById: async (id: number) => {
    const res = await api.get<Inspection>(`/Inspections/${id}`);
    return res.data;
  },

  create: async (data: any) => {
    const res = await api.post<Inspection>('/Inspections', data);
    return res.data;
  },

  update: async (id: number, data: any) => {
    const res = await api.put<Inspection>(`/Inspections/${id}`, data);
    return res.data;
  },

  revise: async (id: number, data: any) => {
    const res = await api.post<Inspection>(`/Inspections/${id}/revise`, data);
    return res.data;
  },

  finalize: async (id: number) => {
    const res = await api.post<Inspection>(`/Inspections/${id}/finalize`);
    return res.data;
  },

  delete: async (id: number) => {
    await api.delete(`/Inspections/${id}`);
  },

  getWhatsAppLink: async (id: number, notes?: string) => {
    const params = notes ? `?notes=${encodeURIComponent(notes)}` : '';
    const res = await api.get<{ url: string }>(`/Inspections/${id}/whatsapp-link${params}`);
    return res.data.url;
  },

  generatePdf: async (id: number) => {
    const res = await api.post(`/Inspections/${id}/generate-pdf`, null, { responseType: 'blob' });
    return res.data;
  }
};
