import axiosClient from './axiosClient';

export interface MechanicDto {
  id: number;
  fullName?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  notes?: string;
  isActive: boolean;
  isDeleted: boolean;
  email?: string;
  hiredAt?: string;
}

export interface MechanicWorkHistoryItem {
  workOrderId: number;
  orderNumber: string;
  date: string;
  carPlate: string;
  carDescription: string;
  role: 'Main' | 'Helper';
  status: string;
  totalAmount: number;
}

export interface MechanicWorkHistory {
  mechanicId: number;
  mechanicName: string;
  phone?: string;
  isActive: boolean;
  totalOrdersWorked: number;
  workOrders: MechanicWorkHistoryItem[];
}

export const mechanicService = {
  getAll: (includeArchived = false): Promise<MechanicDto[]> => 
    axiosClient.get('/mechanics', { params: { includeArchived } }).then(r => r.data),
  
  getById: (id: number): Promise<MechanicDto> => 
    axiosClient.get(`/mechanics/${id}`).then(r => r.data),
  
  create: (dto: { fullName: string; phone?: string; notes?: string; isActive?: boolean }): Promise<MechanicDto> => 
    axiosClient.post('/mechanics', dto).then(r => r.data),
  
  update: (id: number, dto: { fullName: string; phone?: string; notes?: string; isActive?: boolean }): Promise<MechanicDto> => 
    axiosClient.put(`/mechanics/${id}`, dto).then(r => r.data),
  
  archive: (id: number): Promise<any> => 
    axiosClient.post(`/mechanics/${id}/archive`).then(r => r.data),
  
  restore: (id: number): Promise<any> => 
    axiosClient.post(`/mechanics/${id}/restore`).then(r => r.data),
  
  getWorkHistory: (id: number, params?: { from?: string; to?: string }): Promise<MechanicWorkHistory> => 
    axiosClient.get(`/mechanics/${id}/work-history`, { params }).then(r => r.data),
};

export default mechanicService;
