export type BoutiqueOrderStatus = 'PENDING' | 'APPROVED' | 'MODIFIED_AND_APPROVED' | 'REJECTED' | 'CANCELLED' | 'DELIVERED';

export interface BoutiqueOrderItem {
  id?: number;
  productId: number;
  productReference: string;
  productName: string;
  productImageUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface BoutiqueOrder {
  id: number;
  orderNumber: string;
  boutiqueId: number;
  boutiqueName: string;
  orderDate: string;
  status: BoutiqueOrderStatus;
  totalAmount: number;
  deliveryDate?: string;
  vehicleRegistration?: string;
  driverName?: string;
  driverPhone?: string;
  attachmentUrl?: string;
  boutiqueSignature?: string;
  depotSignature?: string;
  invoiceCreated?: boolean;
  invoiceId?: number;
  invoiceNumber?: string;
  note?: string;
  createdByUser?: string;
  items: BoutiqueOrderItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBoutiqueOrderItemRequest {
  productId: number;
  quantity: number;
}

export interface CreateBoutiqueOrderRequest {
  boutiqueId: number;
  note?: string;
  items: CreateBoutiqueOrderItemRequest[];
}

export interface ApproveBoutiqueOrderRequest {
  deliveryDate?: string;
  vehicleRegistration?: string;
  driverName?: string;
  driverPhone?: string;
  attachmentUrl?: string;
  modifiedItems?: CreateBoutiqueOrderItemRequest[];
}
