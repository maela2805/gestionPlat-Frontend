import { Product } from './product.model';

export type MovementType = 'ENTREE' | 'SORTIE';
export type MovementReason = 'REAPPROVISIONNEMENT' | 'VENTE' | 'PERTE' | 'AJUSTEMENT' | 'RETOUR_FOURNISSEUR';

export interface StockMovement {
  id: number;
  product: Product;
  quantity: number;
  type: MovementType;
  reason: MovementReason;
  userEmail?: string;
  note?: string;
  createdAt: string;
}
