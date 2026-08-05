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

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-invoices',
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.scss']
})
export class InvoicesComponent implements OnInit {

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
  newInvoiceDate: string = new Date().toISOString().substring(0, 10);
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

  // Edit Invoice Form State
  editInvoiceId: number | null = null;
  editInvoiceDate: string = '';
  editDueDate: string = '';
  editTaxRate: number = 0;
  editNote: string = '';
  editPaidAmount: number = 0;
  editStatus: string = 'VALIDEE';
  editItems: { description: string; quantity: number; unitPriceHt: number; taxRate: number }[] = [];
  showEditModal: boolean = false;

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
    private productService: ProductService,
    public authService: AuthService
  ) {}

  isEmployee(): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    const r = user.roleName || (user.role && typeof user.role === 'object' ? user.role.name : user.role) || '';
    return r === 'ROLE_EMPLOYEE' || r === 'EMPLOYEE' || r === 'ROLE_CAISSIER' || r === 'CAISSIER' || !!user.boutiqueId;
  }

  canCreateInvoice(): boolean {
    return !this.isEmployee();
  }

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

  activeTab: 'ALL' | 'CESSION' | 'VENTE' | 'ACHAT' | 'PAYMENTS' = 'ALL';

  setTab(tab: 'ALL' | 'CESSION' | 'VENTE' | 'ACHAT' | 'PAYMENTS'): void {
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
      let matchType = false;
      if (this.activeTab === 'ALL') {
        matchType = true;
      } else if (this.activeTab === 'CESSION') {
        matchType = inv.type === InvoiceType.CESSION_BOUTIQUE || (inv.type as any) === 'CESSION_BOUTIQUE';
      } else if (this.activeTab === 'VENTE') {
        matchType = inv.type === InvoiceType.VENTE;
      } else if (this.activeTab === 'ACHAT') {
        matchType = inv.type === InvoiceType.ACHAT;
      }

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
    this.newInvoiceDate = new Date().toISOString().substring(0, 10);
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
      invoiceDate: this.newInvoiceDate ? new Date(this.newInvoiceDate).toISOString() : undefined,
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
        this.showSuccess(`Facture N° ${created.invoiceNumber || ''} créée avec succès.`);
        this.closeCreateModal();
        this.searchQuery = '';
        this.selectedStatus = '';
        this.activeTab = 'ALL';
        this.loadInvoices();
      },
      error: (err) => alert('Erreur lors de la création de la facture.')
    });
  }

  generateFromSale(saleId: number): void {
    this.invoiceService.createInvoiceFromSale(saleId).subscribe({
      next: (created) => {
        this.showSuccess('Facture générée avec succès depuis la vente.');
        this.searchQuery = '';
        this.selectedStatus = '';
        this.activeTab = 'ALL';
        this.loadInvoices();
      },
      error: () => alert('Erreur lors de la génération de la facture.')
    });
  }

  generateFromPurchaseOrder(poId: number): void {
    this.invoiceService.createInvoiceFromPurchaseOrder(poId).subscribe({
      next: (created) => {
        this.showSuccess('Facture générée avec succès depuis la commande fournisseur.');
        this.searchQuery = '';
        this.selectedStatus = '';
        this.activeTab = 'ALL';
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


  confirmDelivery(invoice: Invoice): void {
    if (!invoice.id) return;
    if (!confirm(`Confirmer que la livraison de la facture N° ${invoice.invoiceNumber} a bien été effectuée ?`)) return;

    this.invoiceService.confirmDelivery(invoice.id).subscribe({
      next: (updated) => {
        this.showSuccess(`Livraison confirmée pour la facture N° ${updated.invoiceNumber}.`);
        if (this.selectedInvoice && this.selectedInvoice.id === updated.id) {
          this.selectedInvoice = updated;
        }
        this.loadInvoices();
      },
      error: () => alert('Erreur lors de la confirmation de livraison.')
    });
  }

  openEditModal(invoice: Invoice): void {
    this.selectedInvoice = invoice;
    this.editInvoiceId = invoice.id || null;
    this.editInvoiceDate = invoice.invoiceDate ? invoice.invoiceDate.substring(0, 10) : '';
    this.editDueDate = invoice.dueDate ? invoice.dueDate.substring(0, 10) : '';
    this.editTaxRate = invoice.taxRate || 0;
    this.editNote = invoice.note || '';
    this.editPaidAmount = invoice.paidAmount || 0;
    this.editStatus = invoice.status || 'VALIDEE';
    this.editItems = invoice.items && invoice.items.length > 0
      ? invoice.items.map(i => ({ description: i.description, quantity: i.quantity, unitPriceHt: i.unitPriceHt, taxRate: i.taxRate || 0 }))
      : [{ description: '', quantity: 1, unitPriceHt: 0, taxRate: 0 }];
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editInvoiceId = null;
  }

  addEditItemLine(): void {
    this.editItems.push({ description: '', quantity: 1, unitPriceHt: 0, taxRate: 0 });
  }

  removeEditItemLine(index: number): void {
    if (this.editItems.length > 1) {
      this.editItems.splice(index, 1);
    }
  }

  calculateEditSubtotal(): number {
    return this.editItems.reduce((acc, item) => acc + (item.quantity * item.unitPriceHt), 0);
  }

  calculateEditTax(): number {
    return (this.calculateEditSubtotal() * this.editTaxRate) / 100;
  }

  calculateEditTotal(): number {
    return this.calculateEditSubtotal() + this.calculateEditTax();
  }

  saveEditInvoice(): void {
    if (!this.editInvoiceId) return;

    const req = {
      invoiceDate: this.editInvoiceDate ? new Date(this.editInvoiceDate).toISOString() : undefined,
      dueDate: this.editDueDate ? new Date(this.editDueDate).toISOString() : undefined,
      taxRate: this.editTaxRate,
      note: this.editNote,
      paidAmount: this.editPaidAmount,
      status: this.editStatus,
      items: this.editItems.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPriceHt: item.unitPriceHt,
        taxRate: item.taxRate || this.editTaxRate
      }))
    };

    this.invoiceService.updateInvoice(this.editInvoiceId, req).subscribe({
      next: (updated) => {
        this.showSuccess('Facture mise à jour avec succès.');
        this.closeEditModal();
        this.loadInvoices();
      },
      error: () => alert('Erreur lors de la modification de la facture.')
    });
  }

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
    this.blDeliveryDate = invoice.deliveryDate ? new Date(invoice.deliveryDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10);
    this.blVehicleRegistration = invoice.vehicleRegistration || '';
    this.blDriverName = invoice.driverName || '';
    this.blDriverPhone = invoice.driverPhone || '';
    this.blAttachmentUrl = invoice.attachmentUrl || '';

    // Si les infos ont déjà été renseignées (ou pour un employé), afficher DIRECTEMENT l'aperçu du document (capture d'écran).
    // Si c'est la toute 1ère fois (aucune info saisie), afficher le formulaire de saisie initiale.
    const hasBeenFilled = !!(invoice.driverName || invoice.vehicleRegistration || invoice.deliveryDate);
    if (hasBeenFilled || this.isEmployee()) {
      this.showBlFormStep = false; // Directement la vue Aperçu du Document
    } else {
      this.showBlFormStep = true;  // 1ère fois : Formulaire de saisie
    }
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
    if (!this.selectedInvoice || !this.selectedInvoice.id) {
      this.showBlFormStep = false;
      return;
    }

    const req: any = {
      deliveryDate: this.blDeliveryDate ? new Date(this.blDeliveryDate).toISOString() : undefined,
      vehicleRegistration: this.blVehicleRegistration,
      driverName: this.blDriverName,
      driverPhone: this.blDriverPhone,
      attachmentUrl: this.blAttachmentUrl
    };

    this.invoiceService.updateInvoice(this.selectedInvoice.id, req).subscribe({
      next: (updated) => {
        this.selectedInvoice = updated;
        if (updated.driverName) this.blDriverName = updated.driverName;
        if (updated.driverPhone) this.blDriverPhone = updated.driverPhone;
        if (updated.vehicleRegistration) this.blVehicleRegistration = updated.vehicleRegistration;
        if (updated.attachmentUrl) this.blAttachmentUrl = updated.attachmentUrl;
        this.showBlFormStep = false;
        this.loadInvoices();
      },
      error: () => {
        this.showBlFormStep = false;
      }
    });
  }

  editBlInfo(): void {
    this.showBlFormStep = true;
  }

  printInvoice(invoice?: Invoice): void {
    if (invoice) {
      this.selectedInvoice = invoice;
      this.showDetailModal = true;
      setTimeout(() => window.print(), 350);
    } else {
      window.print();
    }
  }

  showSuccess(msg: string): void {
    this.successMsg = msg;
    setTimeout(() => this.successMsg = null, 4000);
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'BROUILLON': return 'badge-secondary';
      case 'VALIDEE': return 'badge-info';
      case 'PAYEE_PARTIEL': return 'badge-warning';
      case 'PAYEE': return 'badge-success';
      case 'ANNULEE': return 'badge-danger';
      default: return 'badge-primary';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'BROUILLON': return 'Brouillon';
      case 'VALIDEE': return 'VALIDÉE';
      case 'PAYEE_PARTIEL': return 'Partiellement Payée';
      case 'PAYEE': return 'PAYÉE';
      case 'ANNULEE': return 'Annulée';
      default: return status;
    }
  }
}
