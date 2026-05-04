import client from './axiosClient';
import { PurchaseOrder, PlaceOrderDto } from '../types';

export const getAllOrders      = ()                                         => client.get<PurchaseOrder[]>('/purchaseorders').then(r => r.data);
export const getMyOrders       = ()                                         => client.get<PurchaseOrder[]>('/purchaseorders/my').then(r => r.data);
export const getAssignedOrders = ()                                         => client.get<PurchaseOrder[]>('/purchaseorders/assigned').then(r => r.data);
export const getPendingOrders  = ()                                         => client.get<PurchaseOrder[]>('/purchaseorders/pending').then(r => r.data);
export const getOrderById      = (id: number)                              => client.get<PurchaseOrder>(`/purchaseorders/${id}`).then(r => r.data);
export const placeOrder        = (dto: PlaceOrderDto)                      => client.post<PurchaseOrder>('/purchaseorders', dto).then(r => r.data);
export const assignMechanic    = (id: number, mechanicId: number)          => client.patch(`/purchaseorders/${id}/assign`, { mechanicId });
export const updateOrderStatus = (id: number, status: string)              => client.patch(`/purchaseorders/${id}/status`, { status });
export const cancelOrder       = (id: number)                              => client.delete(`/purchaseorders/${id}`);

export const purchaseOrderService = {
  getAllOrders,
  getMyOrders,
  getAssignedOrders,
  getPendingOrders,
  getOrderById,
  placeOrder,
  assignMechanic,
  updateOrderStatus,
  cancelOrder
};

export default purchaseOrderService;
