export type StoreSaleStatus = 'BROUILLON' | 'VALIDEE' | 'ANNULEE';

export interface StoreSaleItem {
  id?: number;
  productId: number;
  productReference?: string;
  productName?: string;
  wholesalePrice: number;
  quantity: number;
  totalPrice: number;
}

export interface StoreSale {
  id: number;
  reference: string;
  boutiqueId: number;
  boutiqueCode?: string;
  boutiqueName?: string;
  saleDate: string;
  status: StoreSaleStatus;
  totalAmount: number;
  userEmail?: string;
  note?: string;
  items: StoreSaleItem[];
  createdAt?: string;
}

export interface CreateStoreSaleItemRequest {
  productId: number;
  wholesalePrice?: number;
  quantity: number;
}

export interface CreateStoreSaleRequest {
  reference?: string;
  boutiqueId: number;
  note?: string;
  items: CreateStoreSaleItemRequest[];
}
