export type PaymentMethod = 'ESPECES' | 'WAVE' | 'ORANGE_MONEY' | 'CARTE' | 'CHEQUE' | 'CREDIT';
export type PosSaleStatus = 'PAYEE' | 'ANNULEE';

export interface CreatePosSaleItemRequest {
  productId: number;
  quantity: number;
  unitPrice?: number;
  discount?: number;
}

export interface CreatePosSaleRequest {
  boutiqueId: number;
  cashSessionId?: number;
  clientId?: number;
  discountAmount?: number;
  taxAmount?: number;
  amountPaid?: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  items: CreatePosSaleItemRequest[];
}

export interface PosSaleItem {
  id: number;
  productId: number;
  productReference: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  totalPrice: number;
}

export interface PosSale {
  id: number;
  receiptNumber: string;
  cashSessionId: number;
  sessionReference: string;
  boutiqueId: number;
  boutiqueCode: string;
  boutiqueName: string;
  clientId?: number;
  clientName?: string;
  saleDate: string;
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  amountPaid: number;
  changeReturned: number;
  paymentMethod: PaymentMethod;
  status: PosSaleStatus;
  userEmail: string;
  notes?: string;
  items: PosSaleItem[];
  createdAt: string;
}
