import api from './axiosClient';
import { WorkOrder } from './workOrderService';

export interface AdminDashboardData {
  totalActiveWorkOrders: number;
  pendingOrdersCount: number;
  inProgressOrdersCount: number;
  completedOrdersCount: number;
  deliveredOrdersCount: number;
  todayRevenue: number;
  monthRevenue: number;
  outstandingReceivables: number;
  totalCustomers: number;
  totalCars: number;
  lowStockPartsCount: number;
  totalInspectionsCount: number;
  recentWorkOrders: WorkOrder[];
  recentInspections: any[];
}

export interface CustomerDashboardData {
  customerId: number;
  customerName: string;
  phone: string;
  email: string;
  myCars: any[];
  activeOrders: WorkOrder[];
  orderHistory: WorkOrder[];
  invoices: any[];
  finalizedInspections: any[];
}

export const dashboardService = {
  getAdminDashboard: async () => {
    const res = await api.get<AdminDashboardData>('/Dashboard/admin');
    return res.data;
  },

  getCustomerDashboard: async (customerId?: number) => {
    const params = customerId ? `?customerId=${customerId}` : '';
    const res = await api.get<CustomerDashboardData>(`/Dashboard/customer${params}`);
    return res.data;
  }
};
