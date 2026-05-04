export interface Customer {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  keycloakUserId: string;
  createdAt: string;
}

export interface Mechanic {
  id: number;
  fullName: string;
  specialization: string;
}

export interface RepairOrder {
  id: number;
  carId: number;
  description: string;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
  createdAt: string;
}

export interface CartItem {
  id: number;
  itemType: 'Service' | 'SparePart';
  itemId: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  addedAt: string;
}

export interface AddToCartDto {
  itemType: 'Service' | 'SparePart';
  itemId: number;
  quantity: number;
}

export interface UpdateCartItemDto {
  quantity: number;
}

export interface PurchaseOrderItem {
  id: number;
  itemType: string;
  itemId: number;
  itemName: string;
  itemDescription: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: number;
  customerId: number;
  customerName: string;
  carId: number;
  carInfo: string;
  mechanicId?: number;
  mechanicName?: string;
  status: string;
  totalAmount: number;
  notes: string;
  placedAt: string;
  completedAt?: string;
  items: PurchaseOrderItem[];
}

export interface PlaceOrderDto {
  carId: number;
  notes: string;
}

export interface PurchaseReceipt {
  id: number;
  purchaseOrderId: number;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  carInfo: string;
  mechanicName?: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  notes: string;
  issuedAt: string;
  isOwnerCopy: boolean;
  status: string;
}
