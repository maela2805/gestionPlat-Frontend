export type TiersType = 'FOURNISSEUR' | 'CLIENT' | 'PARTENAIRE';
export type TiersStatus = 'ACTIF' | 'INACTIF';

export interface Tiers {
  id: number;
  code: string;
  name: string;
  type: TiersType;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  taxId?: string;
  status: TiersStatus;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTiersRequest {
  code?: string;
  name: string;
  type: TiersType;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  taxId?: string;
  status?: TiersStatus;
  note?: string;
}

export interface UpdateTiersRequest {
  name: string;
  type: TiersType;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  taxId?: string;
  status: TiersStatus;
  note?: string;
}
