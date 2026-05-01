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
