export type FundTransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface FundTransfer {
  id: number;
  reference: string;
  boutiqueId: number;
  boutiqueName: string;
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
}
