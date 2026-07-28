export type CashSessionStatus = 'OPEN' | 'CLOSED';
export type CashMovementType = 'ENTREE' | 'SORTIE';

export interface CashMovement {
  id?: number;
  cashSessionId?: number;
  type: CashMovementType;
  amount: number;
  reason: string;
  userEmail?: string;
  createdAt?: string;
}

export interface OpenCashSessionRequest {
  boutiqueId: number;
  openingBalance: number;
  notes?: string;
}

export interface CloseCashSessionRequest {
  closingBalanceReal: number;
  notes?: string;
}

export interface CreateCashMovementRequest {
  type: CashMovementType;
  amount: number;
  reason: string;
}

export interface CashSession {
  id: number;
  sessionReference: string;
  boutiqueId: number;
  boutiqueCode: string;
  boutiqueName: string;
  userEmail: string;
  openingDate: string;
  closingDate?: string;
  openingBalance: number;
  closingBalanceExpected: number;
  closingBalanceReal?: number;
  cashDifference?: number;
  totalSalesCash: number;
  totalSalesMobileMoney: number;
  totalSalesCard: number;
  totalSalesOther: number;
  totalCashIn?: number;
  totalCashOut?: number;
  status: CashSessionStatus;
  notes?: string;
  movements?: CashMovement[];
  createdAt: string;
}
