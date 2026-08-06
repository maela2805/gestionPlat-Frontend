export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface BoutiquePromotion {
  id: number;
  name: string;
  boutiqueId?: number;
  boutiqueName?: string;
  productId: number;
  productName?: string;
  productReference?: string;
  originalPrice: number;
  promoPrice: number;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  active: boolean;
  currentlyActive: boolean;
}

export interface CreateBoutiquePromotionRequest {
  name: string;
  boutiqueId?: number | null;
  productId: number;
  discountType: DiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
}
