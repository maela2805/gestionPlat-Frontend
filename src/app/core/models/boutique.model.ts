export interface Boutique {
  id: number;
  code: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  managerName?: string;
  employeeUserId?: number;
  employeeUserName?: string;
  active: boolean;
  createdAt?: string;
}

export interface CreateBoutiqueRequest {
  code?: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  managerName?: string;
  employeeUserId?: number;
  active?: boolean;
}

export interface BoutiquePrice {
  id?: number;
  boutiqueId: number;
  boutiqueName: string;
  productId: number;
  productReference: string;
  productName: string;
  defaultBuyPrice: number;
  defaultSellPrice: number;
  wholesalePrice: number;
  active: boolean;
}

export interface SetWholesalePriceRequest {
  productId: number;
  wholesalePrice: number;
  active?: boolean;
}
