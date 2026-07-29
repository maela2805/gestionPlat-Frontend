export enum InvoiceType {
  VENTE = 'VENTE',
  ACHAT = 'ACHAT'
}

export enum InvoiceStatus {
  BROUILLON = 'BROUILLON',
  VALIDEE = 'VALIDEE',
  PAYEE_PARTIEL = 'PAYEE_PARTIEL',
  PAYEE = 'PAYEE',
  ANNULEE = 'ANNULEE'
}

export enum PaymentMethod {
  ESPECES = 'ESPECES',
  VIREMENT = 'VIREMENT',
  CHEQUE = 'CHEQUE',
  ORANGE_MONEY = 'ORANGE_MONEY',
  WAVE = 'WAVE',
  CARTE_BANCAIRE = 'CARTE_BANCAIRE'
}

export interface InvoiceItem {
  id?: number;
  description: string;
  quantity: number;
  unitPriceHt: number;
  taxRate?: number;
  totalHt?: number;
  totalTtc?: number;
}

export interface Payment {
  id?: number;
  paymentNumber?: string;
  invoiceId: number;
  invoiceNumber?: string;
  tiersId?: number;
  tiersName?: string;
  paymentDate?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string;
  note?: string;
  createdAt?: string;
}

export interface Invoice {
  id?: number;
  invoiceNumber?: string;
  type: InvoiceType;
  status: InvoiceStatus;
  invoiceDate?: string;
  dueDate?: string;
  tiersId?: number;
  tiersName?: string;
  tiersCode?: string;
  boutiqueId?: number;
  boutiqueName?: string;
  sourceSaleId?: number;
  sourcePurchaseOrderId?: number;
  subtotalHt: number;
  taxRate?: number;
  taxAmount: number;
  totalTtc: number;
  paidAmount: number;
  remainingAmount: number;
  note?: string;
  items: InvoiceItem[];
  payments?: Payment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInvoiceRequest {
  type: InvoiceType;
  invoiceDate?: string;
  dueDate?: string;
  tiersId?: number;
  boutiqueId?: number;
  taxRate?: number;
  note?: string;
  items: {
    description: string;
    quantity: number;
    unitPriceHt: number;
    taxRate?: number;
  }[];
}

export interface CreatePaymentRequest {
  invoiceId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate?: string;
  reference?: string;
  note?: string;
}
