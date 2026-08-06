import { Component, OnInit, inject } from '@angular/core';
import { CashSessionService } from '../../core/services/cash-session.service';
import { PosSaleService } from '../../core/services/pos-sale.service';
import { BoutiqueService } from '../../core/services/boutique.service';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { TiersService } from '../../core/services/tiers.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import { AuthService } from '../../core/services/auth.service';

import { FundTransferService } from '../../core/services/fund-transfer.service';

import { CashSession, CashMovementType } from '../../core/models/cash-session.model';
import { PosSale, PaymentMethod, CreatePosSaleRequest } from '../../core/models/pos-sale.model';
import { Boutique } from '../../core/models/boutique.model';
import { Product } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { Tiers, CreateTiersRequest } from '../../core/models/tiers.model';

import { BoutiquePromotionService } from '../../core/services/boutique-promotion.service';

export interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

@Component({
  selector: 'app-caisse-pos',
  templateUrl: './caisse-pos.component.html',
  styleUrls: ['./caisse-pos.component.scss']
})
export class CaissePosComponent implements OnInit {
  private cashSessionService = inject(CashSessionService);
  private posSaleService = inject(PosSaleService);
  private boutiqueService = inject(BoutiqueService);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private tiersService = inject(TiersService);
  private warehouseService = inject(WarehouseService);
  private fundTransferService = inject(FundTransferService);
  public authService = inject(AuthService);

  boutiques: Boutique[] = [];
  selectedBoutiqueId: number | null = null;
  currentSession: CashSession | null = null;

  products: Product[] = [];
  categories: Category[] = [];
  clients: Tiers[] = [];

  selectedCategoryId: number | null = null;
  searchTerm: string = '';
  selectedClientId: number | null = null;
  isCustomClient: boolean = false;
  customClientName: string = '';
  customClientPhone: string = '';
  customClientEmail: string = '';
  customClientAddress: string = '';
  customClientCity: string = '';
  saveClient: boolean = false;
  showClientModal: boolean = false;

  // Cart
  cart: CartItem[] = [];
  paymentMethod: PaymentMethod = 'ESPECES';
  discountAmount: number = 0;
  amountPaid: number = 0;
  notes: string = '';

  // Modals
  showOpenModal = false;
  openBalanceInput: number = 0;
  openNotesInput: string = '';

  showCloseModal = false;
  closeBalanceRealInput: number = 0;
  closeNotesInput: string = '';

  showMovementModal = false;
  movementType: CashMovementType = 'ENTREE';
  movementAmount: number = 0;
  movementReason: string = '';

  showTransferModal = false;
  transferAmount: number | null = null;
  transferPaymentMethod: string = 'ESPECES';
  transferProofUrl: string = '';
  transferNotes: string = '';
  transferLoading = false;

  showReceiptModal = false;
  lastSale: PosSale | null = null;

  loading = false;
  errorMsg: string | null = null;
  successMsg: string | null = null;

  openTransferModal(): void {
    const suggestedAmount = (this.currentSession?.remainingToTransfer !== undefined) 
      ? this.currentSession.remainingToTransfer 
      : (this.currentSession?.totalSalesCash || null);
    this.transferAmount = suggestedAmount && suggestedAmount > 0 ? suggestedAmount : null;
    this.transferProofUrl = '';
    this.transferNotes = this.currentSession ? `Versement recette caisse Réf: ${this.currentSession.sessionReference}` : '';
    this.showTransferModal = true;
  }

  submitTransfer(): void {
    if (!this.transferAmount || this.transferAmount <= 0) {
      this.errorMsg = 'Veuillez saisir un montant valide à verser.';
      return;
    }

    const bId = this.selectedBoutiqueId ? Number(this.selectedBoutiqueId) : (this.currentSession?.boutiqueId ? Number(this.currentSession.boutiqueId) : null);
    if (!bId) {
      this.errorMsg = 'Veuillez sélectionner la boutique concernée par le versement.';
      return;
    }

    this.transferLoading = true;
    this.fundTransferService.createTransfer({
      boutiqueId: bId,
      cashSessionId: this.currentSession?.id,
      amount: this.transferAmount,
      paymentMethod: this.transferPaymentMethod || 'ESPECES',
      proofUrl: this.transferProofUrl || undefined,
      notes: this.transferNotes || undefined
    }).subscribe({
      next: (t) => {
        this.transferLoading = false;
        this.showTransferModal = false;
        this.successMsg = `Versement de ${(this.transferAmount || 0).toLocaleString()} FCFA vers la Caisse Principale enregistré avec succès (Réf: ${t.reference}).`;
        this.loadCurrentSession();
        setTimeout(() => this.successMsg = null, 6000);
      },
      error: (err) => {
        this.transferLoading = false;
        const serverMsg = typeof err.error === 'string' ? err.error : (err.error?.message || err.message);
        this.errorMsg = serverMsg ? `Erreur versement: ${serverMsg}` : 'Erreur lors de la création du versement.';
      }
    });
  }

  ngOnInit(): void {
    this.loadBoutiques();
    this.loadCategories();
    this.loadClients();
  }

  get isAdmin(): boolean {
    return this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN']);
  }

  loadBoutiques(): void {
    this.boutiqueService.getAllBoutiques().subscribe({
      next: (data) => {
        const u = this.authService.currentUser();
        if (!this.isAdmin && u && u.boutiqueId) {
          this.boutiques = data.filter(b => b.id === u.boutiqueId);
          this.selectedBoutiqueId = u.boutiqueId;
        } else {
          this.boutiques = data;
          if (data.length > 0 && !this.selectedBoutiqueId) {
            this.selectedBoutiqueId = (u && u.boutiqueId && data.some(b => b.id === u.boutiqueId)) ? u.boutiqueId : data[0].id;
          }
        }
        this.onBoutiqueChange();
      },
      error: (err) => this.showError('Erreur de chargement des boutiques')
    });
  }

  onBoutiqueChange(): void {
    if (!this.selectedBoutiqueId) return;
    this.loadCurrentSession();
    this.loadProducts();
  }

  loadCurrentSession(): void {
    if (!this.selectedBoutiqueId) return;
    this.cashSessionService.getCurrentBoutiqueSession(this.selectedBoutiqueId).subscribe({
      next: (session) => {
        this.currentSession = session;
      },
      error: (err) => console.error(err)
    });
  }

  private promotionService = inject(BoutiquePromotionService);

  loadProducts(): void {
    if (!this.selectedBoutiqueId) return;
    this.loading = true;

    this.promotionService.getActivePromotions(this.selectedBoutiqueId).subscribe({
      next: (promos) => {
        const promoMap = new Map<number, any>();
        if (promos) {
          promos.forEach(p => promoMap.set(p.productId, p));
        }

        this.warehouseService.getStocksByBoutique(this.selectedBoutiqueId!).subscribe({
          next: (boutiqueStocks) => {
            this.loading = false;
            if (boutiqueStocks && boutiqueStocks.length > 0) {
              this.products = boutiqueStocks.map(bs => {
                const promo = promoMap.get(bs.productId);
                const normalPrice = bs.sellPrice || 0;
                return {
                  id: bs.productId,
                  reference: bs.productReference,
                  name: bs.productName + (promo ? ' 🔥 [PROMO]' : ''),
                  buyPrice: bs.buyPrice,
                  sellPrice: promo ? promo.promoPrice : normalPrice,
                  stock: bs.quantity,
                  alertThreshold: bs.alertThreshold || 0,
                  imageUrl: bs.imageUrl,
                  category: bs.categoryId ? { id: bs.categoryId, name: bs.categoryName || '' } : undefined
                };
              });
            } else {
              this.productService.getAllProducts().subscribe({
                next: (allProds) => {
                  this.products = allProds.map(p => {
                    const promo = promoMap.get(p.id);
                    return {
                      ...p,
                      name: p.name + (promo ? ' 🔥 [PROMO]' : ''),
                      sellPrice: promo ? promo.promoPrice : (p.sellPrice || 0)
                    };
                  });
                }
              });
            }
          },
          error: () => this.loading = false
        });
      },
    });
  }

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe({
      next: (data) => this.categories = data,
      error: (err) => console.error(err)
    });
  }

  loadClients(): void {
    this.tiersService.getAllTiers().subscribe({
      next: (data) => this.clients = data.filter(t => t.type === 'CLIENT' || t.type === 'PARTENAIRE'),
      error: (err) => console.error(err)
    });
  }

  get filteredProducts(): Product[] {
    return this.products.filter(p => {
      const matchesCategory = !this.selectedCategoryId || (p.category && p.category.id === this.selectedCategoryId);
      const matchesSearch = !this.searchTerm ||
        p.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.reference.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }

  // Cart operations
  addToCart(product: Product): void {
    if (!this.currentSession || this.currentSession.status !== 'OPEN') {
      this.showError('Veuillez d\'abord OUVRIR la caisse pour effectuer des ventes.');
      return;
    }

    const existing = this.cart.find(item => item.product.id === product.id);
    if (existing) {
      existing.quantity += 1;
      existing.total = (existing.quantity * existing.unitPrice) - existing.discount;
    } else {
      const price = product.sellPrice || 0;
      this.cart.push({
        product: product,
        quantity: 1,
        unitPrice: price,
        discount: 0,
        total: price
      });
    }
  }

  toggleClientMode(): void {
    this.isCustomClient = !this.isCustomClient;
    if (this.isCustomClient) {
      this.selectedClientId = null;
    } else {
      this.customClientName = '';
    }
  }

  updateQuantity(item: CartItem, delta: number): void {
    const newQty = (item.quantity || 1) + delta;
    if (newQty <= 0) {
      this.removeFromCart(item);
    } else {
      item.quantity = newQty;
      item.total = (item.quantity * item.unitPrice) - item.discount;
    }
  }

  onQuantityInputChange(item: CartItem): void {
    if (!item.quantity || item.quantity < 1) {
      item.quantity = 1;
    }
    item.total = (item.quantity * item.unitPrice) - item.discount;
  }

  removeFromCart(item: CartItem): void {
    this.cart = this.cart.filter(i => i !== item);
  }

  clearCart(): void {
    this.cart = [];
    this.discountAmount = 0;
    this.amountPaid = 0;
    this.notes = '';
    this.customClientName = '';
    this.customClientPhone = '';
    this.customClientEmail = '';
    this.customClientAddress = '';
    this.customClientCity = '';
    this.saveClient = false;
    this.selectedClientId = null;
  }

  get subTotal(): number {
    return this.cart.reduce((sum, item) => sum + item.total, 0);
  }

  get netTotal(): number {
    return Math.max(0, this.subTotal - (this.discountAmount || 0));
  }

  get changeReturned(): number {
    if (this.paymentMethod !== 'ESPECES') return 0;
    return Math.max(0, (this.amountPaid || 0) - this.netTotal);
  }

  setQuickTender(amount: number): void {
    this.amountPaid = amount;
  }

  // Sale Submission
  submitSale(): void {
    if (this.cart.length === 0) {
      this.showError('Le panier est vide !');
      return;
    }

    if (!this.selectedBoutiqueId) {
      this.showError('Veuillez sélectionner une boutique.');
      return;
    }

    if (!this.currentSession || this.currentSession.status !== 'OPEN') {
      this.showError('La session de caisse n\'est pas OUVERTE.');
      return;
    }

    const req: CreatePosSaleRequest = {
      boutiqueId: this.selectedBoutiqueId,
      cashSessionId: this.currentSession.id,
      clientId: (!this.isCustomClient && this.selectedClientId) ? this.selectedClientId : undefined,
      customClientName: (this.isCustomClient && this.customClientName) ? this.customClientName : undefined,
      customClientPhone: (this.isCustomClient && this.customClientPhone) ? this.customClientPhone : undefined,
      customClientEmail: (this.isCustomClient && this.customClientEmail) ? this.customClientEmail : undefined,
      customClientAddress: (this.isCustomClient && this.customClientAddress) ? this.customClientAddress : undefined,
      customClientCity: (this.isCustomClient && this.customClientCity) ? this.customClientCity : undefined,
      saveClient: this.isCustomClient ? this.saveClient : false,
      discountAmount: this.discountAmount || 0,
      taxAmount: 0,
      amountPaid: this.paymentMethod === 'ESPECES' ? (this.amountPaid || this.netTotal) : this.netTotal,
      paymentMethod: this.paymentMethod,
      notes: this.notes,
      items: this.cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount
      }))
    };

    this.loading = true;
    this.posSaleService.createPosSale(req).subscribe({
      next: (sale) => {
        this.loading = false;
        this.lastSale = sale;
        this.showReceiptModal = true;
        this.showSuccess(`Vente enregistrée avec succès (Ticket: ${sale.receiptNumber})`);
        this.clearCart();
        this.loadCurrentSession();
        this.loadProducts();
        this.loadClients();
      },
      error: (err) => {
        this.loading = false;
        const msg = typeof err.error === 'string' ? err.error : (err.error?.message || err.message || 'Erreur lors de la validation de la vente');
        alert('⚠️ ' + msg);
        this.showError(msg);
      }
    });
  }

  // Direct Client Registration from POS Modal
  confirmSaveClientModal(): void {
    if (!this.customClientName) {
      this.showError('Le nom du client est obligatoire.');
      return;
    }

    const req: CreateTiersRequest = {
      name: this.customClientName.trim(),
      type: 'CLIENT',
      status: 'ACTIF',
      phone: this.customClientPhone ? this.customClientPhone.trim() : undefined,
      email: this.customClientEmail ? this.customClientEmail.trim() : undefined,
      address: this.customClientAddress ? this.customClientAddress.trim() : undefined,
      city: this.customClientCity ? this.customClientCity.trim() : undefined,
      note: 'Client créé depuis la caisse POS'
    };

    this.loading = true;
    this.tiersService.createTiers(req).subscribe({
      next: (newClient) => {
        this.loading = false;
        this.showClientModal = false;
        this.saveClient = false;
        this.showSuccess(`Client "${newClient.name}" enregistré avec succès dans la base Tiers !`);
        // Refresh clients list and select newly created client
        this.loadClients();
        this.selectedClientId = newClient.id;
        this.isCustomClient = false;
        this.customClientName = '';
        this.customClientPhone = '';
        this.customClientEmail = '';
        this.customClientAddress = '';
        this.customClientCity = '';
      },
      error: (err) => {
        this.loading = false;
        const msg = typeof err.error === 'string' ? err.error : (err.error?.message || err.message || 'Erreur lors de la création du client');
        alert('⚠️ ' + msg);
        this.showError(msg);
      }
    });
  }

  // Open Cash Session
  openSession(): void {
    if (!this.selectedBoutiqueId) {
      this.showError('Veuillez choisir une boutique.');
      return;
    }

    this.loading = true;
    this.cashSessionService.openSession({
      boutiqueId: this.selectedBoutiqueId,
      openingBalance: this.openBalanceInput || 0,
      notes: this.openNotesInput
    }).subscribe({
      next: (session) => {
        this.loading = false;
        this.currentSession = session;
        this.showOpenModal = false;
        this.showSuccess(`Caisse ouverte avec succès ! Fond initial: ${session.openingBalance.toLocaleString()} FCFA`);
      },
      error: (err) => {
        this.loading = false;
        const msg = typeof err.error === 'string' ? err.error : (err.error?.message || err.message || 'Erreur lors de l\'ouverture de caisse');
        alert('⚠️ ' + msg);
        this.showError(msg);
      }
    });
  }

  // Close Cash Session
  closeSession(): void {
    if (!this.currentSession) return;

    this.loading = true;
    this.cashSessionService.closeSession(this.currentSession.id, {
      closingBalanceReal: this.closeBalanceRealInput || 0,
      notes: this.closeNotesInput
    }).subscribe({
      next: (session) => {
        this.loading = false;
        this.currentSession = session;
        this.showCloseModal = false;
        const diff = session.cashDifference || 0;
        const diffMsg = diff === 0 ? 'Caisse juste !' : (diff > 0 ? `Excédent: +${diff.toLocaleString()} FCFA` : `Manco: ${diff.toLocaleString()} FCFA`);
        this.showSuccess(`Caisse CLÔTURÉE avec succès ! (${diffMsg})`);
      },
      error: (err) => {
        this.loading = false;
        const msg = typeof err.error === 'string' ? err.error : (err.error?.message || err.message || 'Erreur lors de la clôture de caisse');
        alert('⚠️ ' + msg);
        this.showError(msg);
      }
    });
  }

  // Add Cash Movement
  addMovement(): void {
    if (!this.currentSession) return;
    if (this.movementAmount <= 0) {
      this.showError('Le montant doit être supérieur à 0.');
      return;
    }
    if (!this.movementReason) {
      this.showError('Veuillez indiquer un motif.');
      return;
    }

    this.loading = true;
    this.cashSessionService.addMovement(this.currentSession.id, {
      type: this.movementType,
      amount: this.movementAmount,
      reason: this.movementReason
    }).subscribe({
      next: (m) => {
        this.loading = false;
        this.showMovementModal = false;
        this.movementAmount = 0;
        this.movementReason = '';
        this.showSuccess(`Mouvement de caisse (${m.type}) enregistré !`);
        this.loadCurrentSession();
      },
      error: (err) => {
        this.loading = false;
        this.showError(err.error?.message || 'Erreur lors de l\'enregistrement du mouvement');
      }
    });
  }

  printReceipt(): void {
    window.print();
  }

  showError(msg: string): void {
    this.errorMsg = msg;
    setTimeout(() => this.errorMsg = null, 5000);
  }

  showSuccess(msg: string): void {
    this.successMsg = msg;
    setTimeout(() => this.successMsg = null, 4000);
  }
}
