import { Category } from './category.model';

export interface Product {
  id: number;
  reference: string;
  name: string;
  description?: string;
  buyPrice: number;
  sellPrice?: number;
  stock: number;
  alertThreshold: number;
  barcode?: string;
  imageUrl?: string;
  category?: Category;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductRequest {
  reference: string;
  name: string;
  description?: string;
  buyPrice: number;
  sellPrice?: number;
  initialStock?: number;
  alertThreshold?: number;
  barcode?: string;
  imageUrl?: string;
  categoryId?: number;
}

export interface StockAdjustmentRequest {
  productId: number;
  quantity: number;
  type: 'ENTREE' | 'SORTIE';
  reason: 'REAPPROVISIONNEMENT' | 'VENTE' | 'PERTE' | 'AJUSTEMENT' | 'RETOUR_FOURNISSEUR';
  note?: string;
}
