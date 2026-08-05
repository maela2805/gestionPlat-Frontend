export type StockReturnType = 'CASSE' | 'DEFAUT_FABRICATION' | 'INVENDU_PERIME' | 'RETOUR_CLIENT';
export type StockReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface CreateStockReturnItemRequest {
  productId: number;
  quantity: number;
  unitPrice?: number;
  note?: string;
}

export interface CreateStockReturnRequest {
  boutiqueId: number;
  type: StockReturnType;
  description?: string;
  mediaUrls?: string[];
  items: CreateStockReturnItemRequest[];
}

export interface RejectStockReturnRequest {
  reason?: string;
}

export interface StockReturnItem {
  id: number;
  productId: number;
  productReference: string;
  productName: string;
  productImageUrl?: string;
  quantity: number;
  unitPrice?: number;
  note?: string;
}

export interface StockReturn {
  id: number;
  reference: string;
  boutiqueId: number;
  boutiqueCode: string;
  boutiqueName: string;
  type: StockReturnType;
  status: StockReturnStatus;
  userEmail: string;
  approvedByEmail?: string;
  description?: string;
  rejectionReason?: string;
  mediaUrls: string[];
  items: StockReturnItem[];
  createdAt: string;
  updatedAt?: string;
}
