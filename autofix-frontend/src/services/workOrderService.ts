import api from './axiosClient';

export interface WorkOrderLine {
  id?: number;
  lineType: string;
  description: string;
  serviceId?: number;
  serviceName?: string;
  sparePartId?: number;
  sparePartName?: string;
  isExternalPart?: boolean;
  externalVendorName?: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  subtotal?: number;
  technicianId?: number;
  technicianName?: string;
}

export interface WorkOrderPhoto {
  id: number;
  fileName: string;
  filePath: string;
  photoType: string;
  caption?: string;
  uploadedAt: string;
}

export interface MechanicHistoryItem {
  id: number;
  workOrderId: number;
  role: string;
  previousMechanicId?: number;
  previousMechanicName?: string;
  newMechanicId?: number;
  newMechanicName?: string;
  assignedBy: string;
  assignedAt: string;
  reason?: string;
}

export interface WorkOrder {
  id: number;
  orderNumber: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  carId: number;
  carMake: string;
  carModel: string;
  carPlate: string;
  carChassis: string;
  assignedTechnicianId?: number;
  assignedTechnicianName?: string;
  helperTechnicianId?: number;
  helperTechnicianName?: string;
  odometerInKm: number;
  fuelLevel: string;
  customerComplaint: string;
  inspectionNotes: string;
  status: string;
  workType?: string;
  workDone?: string;
  workToBeDone?: string;
  notes?: string;
  totalLabor: number;
  totalParts: number;
  totalWorkmanship?: number;
  totalAmount: number;
  receivedAt: string;
  expectedDeliveryAt?: string;
  completedAt?: string;
  deliveredAt?: string;
  lines: WorkOrderLine[];
  photos: WorkOrderPhoto[];
  mechanicHistories?: MechanicHistoryItem[];
}

export const workOrderService = {
  getAll: async (status?: string, customerId?: number, mechanicId?: number) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (customerId) params.append('customerId', customerId.toString());
    if (mechanicId) params.append('mechanicId', mechanicId.toString());
    const res = await api.get<WorkOrder[]>(`/WorkOrders?${params.toString()}`);
    return res.data;
  },

  getById: async (id: number) => {
    const res = await api.get<WorkOrder>(`/WorkOrders/${id}`);
    return res.data;
  },

  getOrCreateInspection: async (id: number) => {
    const res = await api.get<{ inspectionId: number; reportNumber: string; status: string }>(`/WorkOrders/${id}/inspection`);
    return res.data;
  },

  create: async (data: any) => {
    const res = await api.post<WorkOrder>('/WorkOrders', data);
    return res.data;
  },

  update: async (id: number, data: any) => {
    const res = await api.put<WorkOrder>(`/WorkOrders/${id}`, data);
    return res.data;
  },

  assignMechanics: async (id: number, data: { mainMechanicId?: number | null; helperMechanicId?: number | null; reason?: string }) => {
    const res = await api.post<WorkOrder>(`/WorkOrders/${id}/assign-mechanics`, data);
    return res.data;
  },

  getMechanicHistory: async (id: number) => {
    const res = await api.get<MechanicHistoryItem[]>(`/WorkOrders/${id}/mechanic-history`);
    return res.data;
  },

  transitionStatus: async (id: number, newStatus: string, notes?: string) => {
    const res = await api.post<WorkOrder>(`/WorkOrders/${id}/transition`, { newStatus, notes });
    return res.data;
  },

  uploadPhoto: async (id: number, file: File, photoType?: string, caption?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (photoType) formData.append('photoType', photoType);
    if (caption) formData.append('caption', caption);
    const res = await api.post<WorkOrderPhoto>(`/WorkOrders/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  convertToInvoice: async (id: number, options?: { vatPercentage?: number; discountAmount?: number }) => {
    const res = await api.post(`/WorkOrders/${id}/convert-to-invoice`, options || {});
    return res.data;
  },

  getPrintUrl: (id: number) => {
    return `/api/work-orders/${id}/print`;
  },

  getPrintHtml: async (id: number) => {
    const res = await api.get<string>(`/WorkOrders/${id}/print`, { responseType: 'text' as any });
    return res.data;
  },

  delete: async (id: number) => {
    await api.delete(`/WorkOrders/${id}`);
  },

  addLine: async (id: number, line: any) => {
    const res = await api.post<WorkOrder>(`/WorkOrders/${id}/lines`, line);
    return res.data;
  },

  updateLine: async (id: number, lineId: number, line: any) => {
    const res = await api.put<WorkOrder>(`/WorkOrders/${id}/lines/${lineId}`, line);
    return res.data;
  },

  deleteLine: async (id: number, lineId: number, revisionReason?: string) => {
    const params = revisionReason ? `?revisionReason=${encodeURIComponent(revisionReason)}` : '';
    const res = await api.delete<WorkOrder>(`/WorkOrders/${id}/lines/${lineId}${params}`);
    return res.data;
  }
};
