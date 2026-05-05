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


