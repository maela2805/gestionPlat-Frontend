import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BoutiquePromotionService } from '../../core/services/boutique-promotion.service';
import { BoutiqueService } from '../../core/services/boutique.service';
import { ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import { BoutiquePromotion, CreateBoutiquePromotionRequest, DiscountType } from '../../core/models/boutique-promotion.model';
import { Boutique } from '../../core/models/boutique.model';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-promotions',
  templateUrl: './promotions.component.html',
  styleUrls: ['./promotions.component.scss']
})
export class PromotionsComponent implements OnInit {
  promotions = signal<BoutiquePromotion[]>([]);
  boutiques = signal<Boutique[]>([]);
  products = signal<Product[]>([]);

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Filters
  selectedBoutiqueFilter = signal<string>('ALL');
  selectedStatusFilter = signal<string>('ALL'); // ALL, ACTIVE, UPCOMING, EXPIRED
  searchTerm = signal<string>('');

  // Modal
  showModal = signal<boolean>(false);
  promoForm: FormGroup;

  // Selected product for live price calculation preview
  selectedProduct = signal<Product | null>(null);

  // Pagination
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(5);

  get isAdmin(): boolean {
    return this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN']);
  }

  get userBoutiqueId(): number | null {
    const user = this.authService.currentUser();
    return user && user.boutiqueId ? user.boutiqueId : null;
  }

  get isBoutiqueRestricted(): boolean {
    return !this.isAdmin && this.userBoutiqueId !== null;
  }

  constructor(
    private promotionService: BoutiquePromotionService,
    private boutiqueService: BoutiqueService,
    private productService: ProductService,
    public authService: AuthService,
    private fb: FormBuilder
  ) {
    const today = new Date().toISOString().substring(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

    this.promoForm = this.fb.group({
      name: ['', [Validators.required]],
      boutiqueId: [null],
      productId: [null, [Validators.required]],
      discountType: ['PERCENTAGE', [Validators.required]],
      discountValue: [10, [Validators.required, Validators.min(0.01)]],
      startDate: [today, [Validators.required]],
      endDate: [nextWeek, [Validators.required]]
    });
  }

  ngOnInit(): void {
    if (this.isBoutiqueRestricted && this.userBoutiqueId) {
      this.selectedBoutiqueFilter.set(this.userBoutiqueId.toString());
    }
    this.loadData();
    this.setupFormListeners();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.boutiqueService.getAllBoutiques().subscribe(b => this.boutiques.set(b));
    this.productService.getAllProducts().subscribe(p => this.products.set(p));
    
    this.loadPromotions();
  }

  loadPromotions(): void {
    const bId = (this.isBoutiqueRestricted && this.userBoutiqueId) ? Number(this.userBoutiqueId) : undefined;
    this.promotionService.getAllPromotions(bId).subscribe({
      next: (promos) => {
        this.promotions.set(promos);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Erreur lors du chargement des promotions.');
        this.isLoading.set(false);
      }
    });
  }

  private setupFormListeners(): void {
    this.promoForm.get('productId')?.valueChanges.subscribe(pId => {
      if (pId) {
        const prod = this.products().find(p => p.id === Number(pId));
        this.selectedProduct.set(prod || null);
      } else {
        this.selectedProduct.set(null);
      }
    });
  }

  // Live price calculation helper
  calculatedPromoPrice(): number {
    const prod = this.selectedProduct();
    if (!prod || !prod.sellPrice) return 0;

    const original = prod.sellPrice;
    const type: DiscountType = this.promoForm.get('discountType')?.value;
    const val = Number(this.promoForm.get('discountValue')?.value || 0);

    if (type === 'PERCENTAGE') {
      return Math.round(original * (1 - (val / 100)));
    } else {
      return Math.max(0, original - val);
    }
  }

  // Filtered List
  filteredPromotions = computed(() => {
    let list = this.promotions();
    const boutiqueVal = this.selectedBoutiqueFilter();
    const statusVal = this.selectedStatusFilter();
    const search = this.searchTerm().toLowerCase().trim();

    // Filter by Boutique
    if (boutiqueVal !== 'ALL') {
      if (boutiqueVal === 'NULL') {
        list = list.filter(p => !p.boutiqueId);
      } else {
        const bId = Number(boutiqueVal);
        list = list.filter(p => p.boutiqueId === bId || !p.boutiqueId);
      }
    }

    // Filter by Search
    if (search) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(search) ||
        (p.productName && p.productName.toLowerCase().includes(search)) ||
        (p.boutiqueName && p.boutiqueName.toLowerCase().includes(search))
      );
    }

    // Filter by Status
    const now = new Date().toISOString();
    if (statusVal === 'ACTIVE') {
      list = list.filter(p => p.currentlyActive);
    } else if (statusVal === 'UPCOMING') {
      list = list.filter(p => p.active && p.startDate > now);
    } else if (statusVal === 'EXPIRED') {
      list = list.filter(p => p.endDate < now);
    }

    return list;
  });

  // Stats
  activeCount = computed(() => this.promotions().filter(p => p.currentlyActive).length);
  totalCount = computed(() => this.promotions().length);

  // Pagination
  totalPages = computed(() => Math.ceil(this.filteredPromotions().length / this.itemsPerPage()) || 1);
  paginatedPromotions = computed(() => {
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    return this.filteredPromotions().slice(start, start + perPage);
  });

  openCreateModal(): void {
    const today = new Date().toISOString().substring(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

    this.promoForm.reset({
      name: '',
      boutiqueId: null,
      productId: null,
      discountType: 'PERCENTAGE',
      discountValue: 10,
      startDate: today,
      endDate: nextWeek
    });
    this.selectedProduct.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitForm(): void {
    if (this.promoForm.invalid) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formVal = this.promoForm.value;
    const req: CreateBoutiquePromotionRequest = {
      name: formVal.name,
      boutiqueId: formVal.boutiqueId ? Number(formVal.boutiqueId) : null,
      productId: Number(formVal.productId),
      discountType: formVal.discountType,
      discountValue: Number(formVal.discountValue),
      startDate: new Date(formVal.startDate + 'T00:00:00').toISOString(),
      endDate: new Date(formVal.endDate + 'T23:59:59').toISOString()
    };

    this.promotionService.createPromotion(req).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.showModal.set(false);
        this.successMessage.set('Promotion enregistrée et activée avec succès !');
        this.loadPromotions();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || err.message || 'Erreur lors de la création de la promotion.');
      }
    });
  }

  toggleStatus(promo: BoutiquePromotion): void {
    this.promotionService.toggleStatus(promo.id).subscribe({
      next: () => {
        this.loadPromotions();
      },
      error: (err) => {
        this.errorMessage.set(err.message || 'Erreur lors de la modification de statut.');
      }
    });
  }

  deletePromotion(promo: BoutiquePromotion): void {
    if (confirm(`Voulez-vous vraiment supprimer la promotion "${promo.name}" ?`)) {
      this.promotionService.deletePromotion(promo.id).subscribe({
        next: () => {
          this.loadPromotions();
        },
        error: (err) => {
          this.errorMessage.set(err.message || 'Erreur lors de la suppression.');
        }
      });
    }
  }

  updateBoutiqueFilter(e: Event): void {
    this.selectedBoutiqueFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  updateStatusFilter(e: Event): void {
    this.selectedStatusFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  updateSearch(e: Event): void {
    this.searchTerm.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.currentPage.set(p);
    }
  }
}
