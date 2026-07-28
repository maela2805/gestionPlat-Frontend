import { Component, OnInit, inject } from '@angular/core';
import { CashSessionService } from '../../core/services/cash-session.service';
import { PosSaleService } from '../../core/services/pos-sale.service';
import { BoutiqueService } from '../../core/services/boutique.service';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { TiersService } from '../../core/services/tiers.service';
import { AuthService } from '../../core/services/auth.service';

import { CashSession, CashMovementType } from '../../core/models/cash-session.model';
import { PosSale, PaymentMethod, CreatePosSaleRequest } from '../../core/models/pos-sale.model';
import { Boutique } from '../../core/models/boutique.model';
import { Product } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';
import { Tiers } from '../../core/models/tiers.model';

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

  showReceiptModal = false;
  lastSale: PosSale | null = null;

  loading = false;
  errorMsg: string | null = null;
  successMsg: string | null = null;

  ngOnInit(): void {
    this.loadBoutiques();
    this.loadCategories();
    this.loadClients();
  }

  loadBoutiques(): void {
    this.boutiqueService.getAllBoutiques().subscribe({
      next: (data) => {
        this.boutiques = data;
        if (data.length > 0) {
          this.selectedBoutiqueId = data[0].id;
          this.onBoutiqueChange();
        }
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

  loadProducts(): void {
    this.productService.getAllProducts().subscribe({
      next: (data) => {
        this.products = data;
      },
      error: (err) => this.showError('Erreur lors du chargement des produits')
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

  updateQuantity(item: CartItem, delta: number): void {
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      this.removeFromCart(item);
    } else {
      item.quantity = newQty;
      item.total = (item.quantity * item.unitPrice) - item.discount;
    }
  }

  removeFromCart(item: CartItem): void {
    this.cart = this.cart.filter(i => i !== item);
  }

  clearCart(): void {
    this.cart = [];
    this.discountAmount = 0;
    this.amountPaid = 0;
    this.notes = '';
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
      clientId: this.selectedClientId || undefined,
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
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || 'Erreur lors de la validation de la vente';
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
        this.showError(err.error?.message || 'Erreur lors de l\'ouverture de caisse');
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
        const diffText = diff === 0 ? 'Aucun écart' : (diff > 0 ? `Excédent: +${diff.toLocaleString()} FCFA` : `Perte/Manquant: ${diff.toLocaleString()} FCFA`);
        this.showSuccess(`Caisse fermée avec succès. ${diffText}`);
      },
      error: (err) => {
        this.loading = false;
        this.showError(err.error?.message || 'Erreur lors de la fermeture de caisse');
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
