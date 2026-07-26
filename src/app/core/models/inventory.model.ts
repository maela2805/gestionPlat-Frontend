import { Boutique } from './boutique.model';
import { Product } from './product.model';

export type InventoryStatus = 'BROUILLON' | 'VALIDE' | 'ANNULE';

export interface InventoryItem {
  id?: number;
  product: Product;
  theoreticalQuantity: number;
  countedQuantity: number;
  gap: number;
}

export interface Inventory {
  id: number;
  reference: string;
  boutique: Boutique;
  status: InventoryStatus;
  note?: string;
  userEmail?: string;
  items: InventoryItem[];
  createdAt: string;
  validatedAt?: string;
}

export interface InventoryItemRequest {
  productId: number;
  countedQuantity: number;
}

export interface CreateInventoryRequest {
  boutiqueId?: number;
  note?: string;
  items: InventoryItemRequest[];
}
