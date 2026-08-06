import { PaymentMethod } from './invoice.model';

export enum EntryType {
  RECETTE = 'RECETTE',
  DEPENSE = 'DEPENSE'
}

export enum AccountingCategory {
  VENTES_PLATS = 'VENTES_PLATS',
  ACHATS_MATIERES = 'ACHATS_MATIERES',
  LOYER = 'LOYER',
  ELECTRICITE_EAU = 'ELECTRICITE_EAU',
  SALAIRES = 'SALAIRES',
  TRANSPORT_LIVRAISON = 'TRANSPORT_LIVRAISON',
  AUTRES_CHARGES = 'AUTRES_CHARGES',
  AUTRES_PRODUITS = 'AUTRES_PRODUITS'
}

export interface AccountingEntry {
  id?: number;
  entryCode?: string;
  entryDate: string;
  type: EntryType;
  category: AccountingCategory;
  amount: number;
  paymentMethod?: PaymentMethod;
  description: string;
  sourceInvoiceId?: number;
  sourceInvoiceNumber?: string;
  sourceCashSessionId?: number;
  tiersId?: number;
  tiersName?: string;
  createdAt?: string;
}

export interface CreateAccountingEntryRequest {
  entryDate?: string;
  type: EntryType;
  category: AccountingCategory;
  amount: number;
  paymentMethod?: PaymentMethod;
  description: string;
  tiersId?: number;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  clientReceivables: number;
  boutiqueReceivables?: number;
  supplierPayables: number;
  cashBalance: number;
  centralCashBalance?: number;
  expensesByCategory: { [key: string]: number };
}
