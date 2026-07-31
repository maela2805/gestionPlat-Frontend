import { Component, OnInit } from '@angular/core';
import { InvoiceService } from '../../core/services/invoice.service';
import { TiersService } from '../../core/services/tiers.service';
import { BoutiqueService } from '../../core/services/boutique.service';
import { StoreSaleService } from '../../core/services/store-sale.service';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';
import { BoutiquePrice } from '../../core/models/boutique.model';
import {
  Invoice,
  InvoiceType,
  InvoiceStatus,
  PaymentMethod,
  Payment,
  CreateInvoiceRequest,
  CreatePaymentRequest
} from '../../core/models/invoice.model';
import { Tiers } from '../../core/models/tiers.model';
import { Boutique } from '../../core/models/boutique.model';

@Component({
  selector: 'app-invoices',
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.scss']
})
export class InvoicesComponent implements OnInit {

  activeTab: 'VENTE' | 'ACHAT' | 'PAYMENTS' = 'VENTE';
  selectedStatus: string = '';
  searchQuery: string = '';
  loading: boolean = false;
  error: string | null = null;
  successMsg: string | null = null;

  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  allPayments: Payment[] = [];

  tiersList: Tiers[] = [];
  boutiquesList: Boutique[] = [];
  completedSales: any[] = [];
  completedPurchases: any[] = [];
  allProducts: Product[] = [];
  availableProducts: { id: number; name: string; price: number }[] = [];
  boutiquePrices: BoutiquePrice[] = [];

  // Modals state
  showCreateModal: boolean = false;
  showPaymentModal: boolean = false;
  showDetailModal: boolean = false;
  selectedInvoice: Invoice | null = null;

  // New Invoice Form State
  newInvoiceType: InvoiceType = InvoiceType.VENTE;
  newInvoiceTiersId: number | undefined;
  newInvoiceBoutiqueId: number | undefined;
  newInvoiceTaxRate: number = 0;
  newInvoiceNote: string = '';
  newInvoiceItems: { selectedProductId?: number; description: string; quantity: number; unitPriceHt: number; taxRate: number }[] = [];

  // Payment Form State
  paymentAmount: number = 0;
  paymentMethod: PaymentMethod = PaymentMethod.ESPECES;
  paymentReference: string = '';
  paymentNote: string = '';

  // Enums for Template
  InvoiceTypeEnum = InvoiceType;
  InvoiceStatusEnum = InvoiceStatus;
  PaymentMethodEnum = PaymentMethod;

  constructor(
    private invoiceService: InvoiceService,
    private tiersService: TiersService,
    private boutiqueService: BoutiqueService,
    private storeSaleService: StoreSaleService,
    private purchaseOrderService: PurchaseOrderService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.loadInvoices();
    this.loadReferenceData();
  }

  loadInvoices(): void {
    this.loading = true;
    this.error = null;
    this.invoiceService.getAllInvoices().subscribe({
      next: (data) => {
        this.invoices = data;
        this.applyFilter();
        this.collectAllPayments();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des factures.';
        this.loading = false;
      }
    });
  }

  loadReferenceData(): void {
    this.tiersService.getAllTiers().subscribe(tiers => this.tiersList = tiers);
    this.boutiqueService.getAllBoutiques().subscribe(b => this.boutiquesList = b);
    this.storeSaleService.getAllStoreSales().subscribe(sales => this.completedSales = sales);
    this.purchaseOrderService.getAllPurchaseOrders().subscribe(pos => this.completedPurchases = pos);
    this.productService.getAllProducts().subscribe(prods => {
      this.allProducts = prods;
      this.updateAvailableProducts();
    });
  }

  onBoutiqueChange(): void {
    if (this.newInvoiceBoutiqueId) {
      this.boutiqueService.getBoutiquePrices(this.newInvoiceBoutiqueId).subscribe({
        next: (prices) => {
          this.boutiquePrices = prices.filter(p => p.active);
          this.updateAvailableProducts();
        },
        error: () => this.updateAvailableProducts()
      });
    } else {
      this.boutiquePrices = [];
      this.updateAvailableProducts();
    }
  }

  updateAvailableProducts(): void {
    if (this.newInvoiceType === InvoiceType.VENTE && this.newInvoiceBoutiqueId && this.boutiquePrices.length > 0) {
      this.availableProducts = this.boutiquePrices.map(p => ({
        id: p.productId,
        name: p.productName,
        price: p.wholesalePrice || p.defaultSellPrice || 0
      }));
    } else {
      this.availableProducts = this.allProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: this.newInvoiceType === InvoiceType.ACHAT ? (p.buyPrice || 0) : (p.sellPrice || p.buyPrice || 0)
      }));
    }
  }

  onProductSelect(item: { selectedProductId?: number; description: string; unitPriceHt: number }, productIdStr: any): void {
    const prodId = Number(productIdStr);
    const found = this.availableProducts.find(p => p.id === prodId);
    if (found) {
      item.selectedProductId = found.id;
      item.description = found.name;
      item.unitPriceHt = found.price;
    }
  }

  collectAllPayments(): void {
    const list: Payment[] = [];
    this.invoices.forEach(inv => {
      if (inv.payments && inv.payments.length > 0) {
        list.push(...inv.payments);
      }
    });
    this.allPayments = list.sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  }

  setTab(tab: 'VENTE' | 'ACHAT' | 'PAYMENTS'): void {
    this.activeTab = tab;
    this.applyFilter();
  }

  filterByStatus(status: string): void {
    this.selectedStatus = status;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.activeTab === 'PAYMENTS') return;

    this.filteredInvoices = this.invoices.filter(inv => {
      const matchType = inv.type === (this.activeTab as any);
      const matchStatus = !this.selectedStatus || inv.status === this.selectedStatus;
      const q = this.searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
        (inv.tiersName && inv.tiersName.toLowerCase().includes(q)) ||
        (inv.boutiqueName && inv.boutiqueName.toLowerCase().includes(q));

      return matchType && matchStatus && matchQuery;
    });
  }

  // Creation Modal mode
  creationMode: 'FROM_PO' | 'MANUAL' = 'MANUAL';
  selectedPurchaseOrderId: number | undefined;

  openCreateModal(type?: InvoiceType): void {
    this.newInvoiceType = type || (this.activeTab === 'ACHAT' ? InvoiceType.ACHAT : InvoiceType.VENTE);
    this.creationMode = this.newInvoiceType === InvoiceType.ACHAT && this.completedPurchases.length > 0 ? 'FROM_PO' : 'MANUAL';
    this.selectedPurchaseOrderId = undefined;
    this.newInvoiceTiersId = undefined;
    this.newInvoiceBoutiqueId = undefined;
    this.newInvoiceTaxRate = 0;
    this.newInvoiceNote = '';
    this.newInvoiceItems = [{ description: '', quantity: 1, unitPriceHt: 0, taxRate: 0 }];
    this.onBoutiqueChange();
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  addItemLine(): void {
    this.newInvoiceItems.push({ description: '', quantity: 1, unitPriceHt: 0, taxRate: 0 });
  }

  removeItemLine(index: number): void {
    if (this.newInvoiceItems.length > 1) {
      this.newInvoiceItems.splice(index, 1);
    }
  }

  calculateNewInvoiceSubtotal(): number {
    return this.newInvoiceItems.reduce((acc, item) => acc + (item.quantity * item.unitPriceHt), 0);
  }

  calculateNewInvoiceTax(): number {
    const subtotal = this.calculateNewInvoiceSubtotal();
    return (subtotal * this.newInvoiceTaxRate) / 100;
  }

  calculateNewInvoiceTotal(): number {
    return this.calculateNewInvoiceSubtotal() + this.calculateNewInvoiceTax();
  }

  saveInvoice(): void {
    if (!this.newInvoiceItems || this.newInvoiceItems.length === 0 || !this.newInvoiceItems[0].description) {
      alert('Veuillez ajouter au moins un article valide à la facture.');
      return;
    }

    const req: CreateInvoiceRequest = {
      type: this.newInvoiceType,
      tiersId: this.newInvoiceTiersId,
      boutiqueId: this.newInvoiceBoutiqueId,
      taxRate: this.newInvoiceTaxRate,
      note: this.newInvoiceNote,
      items: this.newInvoiceItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPriceHt: item.unitPriceHt,
        taxRate: item.taxRate || this.newInvoiceTaxRate
      }))
    };

    this.invoiceService.createInvoice(req).subscribe({
      next: (created) => {
        this.showSuccess('Facture créée avec succès.');
        this.closeCreateModal();
        this.loadInvoices();
      },
      error: (err) => alert('Erreur lors de la création de la facture.')
    });
  }

  generateFromSale(saleId: number): void {
    this.invoiceService.createInvoiceFromSale(saleId).subscribe({
      next: () => {
        this.showSuccess('Facture générée avec succès depuis la vente.');
        this.loadInvoices();
      },
      error: () => alert('Erreur lors de la génération de la facture.')
    });
  }

  generateFromPurchaseOrder(poId: number): void {
    this.invoiceService.createInvoiceFromPurchaseOrder(poId).subscribe({
      next: () => {
        this.showSuccess('Facture générée avec succès depuis la commande fournisseur.');
        this.loadInvoices();
      },
      error: () => alert('Erreur lors de la génération de la facture.')
    });
  }

  generateFromSelectedPO(): void {
    if (!this.selectedPurchaseOrderId) {
      alert('Veuillez sélectionner une commande fournisseur.');
      return;
    }
    this.invoiceService.createInvoiceFromPurchaseOrder(this.selectedPurchaseOrderId).subscribe({
      next: () => {
        this.showSuccess('Facture d\'achat générée avec succès depuis la commande fournisseur.');
        this.closeCreateModal();
        this.loadInvoices();
      },
      error: () => alert('Erreur lors de la génération de la facture.')
    });
  }

  validateInvoice(invoice: Invoice): void {
    if (!confirm(`Confirmer la validation de la facture ${invoice.invoiceNumber} ?`)) return;

    this.invoiceService.validateInvoice(invoice.id!).subscribe({
      next: () => {
        this.showSuccess('Facture validée.');
        this.loadInvoices();
      },
      error: () => alert('Erreur lors de la validation.')
    });
  }

  cancelInvoice(invoice: Invoice): void {
    if (!confirm(`Êtes-vous sûr de vouloir annuler la facture ${invoice.invoiceNumber} ?`)) return;

    this.invoiceService.cancelInvoice(invoice.id!).subscribe({
      next: () => {
        this.showSuccess('Facture annulée.');
        this.loadInvoices();
      },
      error: () => alert('Erreur lors de l\'annulation.')
    });
  }

  openPaymentModal(invoice: Invoice): void {
    this.selectedInvoice = invoice;
    this.paymentAmount = invoice.remainingAmount || 0;
    this.paymentMethod = PaymentMethod.ESPECES;
    this.paymentReference = '';
    this.paymentNote = '';
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.selectedInvoice = null;
  }

  savePayment(): void {
    if (!this.selectedInvoice || this.paymentAmount <= 0) {
      alert('Montant invalide.');
      return;
    }

    const req: CreatePaymentRequest = {
      invoiceId: this.selectedInvoice.id!,
      amount: this.paymentAmount,
      paymentMethod: this.paymentMethod,
      reference: this.paymentReference,
      note: this.paymentNote
    };

    this.invoiceService.addPayment(req).subscribe({
      next: () => {
        this.showSuccess('Règlement enregistré avec succès.');
        this.closePaymentModal();
        this.loadInvoices();
      },
      error: () => alert('Erreur lors de l\'enregistrement du règlement.')
    });
  }

  showBlModal: boolean = false;
  showBlFormStep: boolean = true;
  blDeliveryDate: string = new Date().toISOString().substring(0, 10);
  blVehicleRegistration: string = '';
  blDriverName: string = '';
  blDriverPhone: string = '';
  blAttachmentUrl: string = '';
  blAttachmentFileName: string | null = null;

  openDetailModal(invoice: Invoice): void {
    this.selectedInvoice = invoice;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedInvoice = null;
  }

  openBlModal(invoice: Invoice): void {
    this.selectedInvoice = invoice;
    this.showBlFormStep = true;
    this.showBlModal = true;
  }

  closeBlModal(): void {
    this.showBlModal = false;
    this.selectedInvoice = null;
  }

  onBlFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.blAttachmentFileName = file.name;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.blAttachmentUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeBlAttachmentFile(): void {
    this.blAttachmentFileName = null;
    this.blAttachmentUrl = '';
  }

  confirmBlPrint(): void {
    this.showBlFormStep = false;
  }

  editBlInfo(): void {
    this.showBlFormStep = true;
  }

  printInvoice(): void {
    window.print();
  }

  showSuccess(msg: string): void {
    this.successMsg = msg;
    setTimeout(() => this.successMsg = null, 4000);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'BROUILLON': return 'badge-secondary';
      case 'VALIDEE': return 'badge-warning';
      case 'PAYEE_PARTIEL': return 'badge-info';
      case 'PAYEE': return 'badge-success';
      case 'ANNULEE': return 'badge-danger';
      default: return 'badge-primary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'BROUILLON': return 'Brouillon';
      case 'VALIDEE': return 'À PAYER';
      case 'PAYEE_PARTIEL': return 'Partiellement Payée';
      case 'PAYEE': return 'PAYÉE';
      case 'ANNULEE': return 'Annulée';
      default: return status;
    }
  }
}
