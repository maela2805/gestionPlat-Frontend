export type PurchaseOrderStatus = 'BROUILLON' | 'VALIDEE' | 'LIVREE' | 'ANNULEE';

export interface PurchaseOrderItem {
  id?: number;
  productId?: number;
  productReference?: string;
  productName?: string;
  unitPrice: number;
  quantityOrdered: number;
  quantityReceived?: number;
  totalPrice: number;
  isPendingProduct?: boolean;
}

export interface PurchaseOrder {
  id: number;
  reference: string;
  supplierId: number;
  supplierCode?: string;
  supplierName?: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  deliveryDate?: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  note?: string;
  items: PurchaseOrderItem[];
  createdAt?: string;
}

export interface CreatePurchaseOrderItemRequest {
  productId?: number;
  productName?: string;
  productReference?: string;
  categoryId?: number;
  unitPrice: number;
  quantityOrdered: number;
}

export interface CreatePurchaseOrderRequest {
  reference?: string;
  supplierId: number;
  expectedDeliveryDate?: string;
  note?: string;
  items: CreatePurchaseOrderItemRequest[];
}
