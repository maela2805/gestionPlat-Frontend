export type FundTransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type VersementType = 'VERSEMENT_RECETTE' | 'VERSEMENT_FACTURE' | 'AUTRE';

export interface FundTransfer {
  id: number;
  reference: string;
  boutiqueId: number;
  boutiqueName: string;
  cashSessionId?: number;
  versemenType?: VersementType;
  invoiceId?: number;
  invoiceNumber?: string;
  invoiceTotalAmount?: number;
  invoiceRemainingAmount?: number;
  amount: number;
  paymentMethod: string;
  proofUrl?: string;
  userEmail: string;
  approvedByEmail?: string;
  status: FundTransferStatus;
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateFundTransferRequest {
  boutiqueId?: number;
  cashSessionId?: number;
  versemenType?: VersementType;
  invoiceId?: number;
  amount: number;
  paymentMethod: string;
  proofUrl?: string;
  notes?: string;
}

export interface BoutiqueWallet {
  boutiqueId: number;
  boutiqueName: string;
  totalCessionInvoicesAmount: number;
  totalPaidAmount: number;
  balanceDue: number;
  pendingTransfersAmount: number;
  availableCashBalance?: number;
}
