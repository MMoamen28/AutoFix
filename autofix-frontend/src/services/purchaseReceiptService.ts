import client from './axiosClient';
import { PurchaseReceipt } from '../types';

export const getAllPurchaseReceipts    = ()           => client.get<PurchaseReceipt[]>('/purchasereceipts').then(r => r.data);
export const getOwnerPurchaseCopies   = ()           => client.get<PurchaseReceipt[]>('/purchasereceipts/owner-copies').then(r => r.data);
export const getMyPurchaseReceipts    = ()           => client.get<PurchaseReceipt[]>('/purchasereceipts/my').then(r => r.data);
export const getPurchaseReceiptById   = (id: number) => client.get<PurchaseReceipt>(`/purchasereceipts/${id}`).then(r => r.data);
export const getPurchaseReceiptByOrder = (orderId: number) => client.get<PurchaseReceipt>(`/purchasereceipts/order/${orderId}`).then(r => r.data);
export const voidPurchaseReceipt      = (id: number) => client.patch(`/purchasereceipts/${id}/void`);

export const purchaseReceiptService = {
  getAllPurchaseReceipts,
  getOwnerPurchaseCopies,
  getMyPurchaseReceipts,
  getPurchaseReceiptById,
  getPurchaseReceiptByOrder,
  voidPurchaseReceipt
};

export default purchaseReceiptService;
