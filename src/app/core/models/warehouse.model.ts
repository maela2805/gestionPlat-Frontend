export interface BoutiqueStockDTO {
  id?: number;
  boutiqueId: number;
  boutiqueName: string;
  productId: number;
  productName: string;
  productReference: string;
  quantity: number;
  buyPrice: number;
  sellPrice?: number;
  alertThreshold?: number;
}

export interface TransferStockRequest {
  fromBoutiqueId: number | null; // null = Entrepôt Central
  toBoutiqueId: number | null;   // null = Entrepôt Central
  productId: number;
  quantity: number;
  note?: string;
}
