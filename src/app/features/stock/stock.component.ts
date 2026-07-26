import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { StockMovementService } from '../../core/services/stock-movement.service';
import { Product, StockAdjustmentRequest } from '../../core/models/product.model';
import { StockMovement, MovementType, MovementReason } from '../../core/models/stock-movement.model';

import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models/category.model';
import { BoutiqueService } from '../../core/services/boutique.service';
import { Boutique } from '../../core/models/boutique.model';

export interface MotifOption {
  value: MovementReason;
  label: string;
  types: MovementType[];
}

export const MOTIF_OPTIONS: MotifOption[] = [
  { value: 'REAPPROVISIONNEMENT', label: 'Réapprovisionnement', types: ['ENTREE'] },
  { value: 'VENTE', label: 'Vente / Plat servi', types: ['SORTIE'] },
  { value: 'PERTE', label: 'Perte / Périmé', types: ['SORTIE'] },
  { value: 'AJUSTEMENT', label: 'Ajustement inventaire', types: ['ENTREE', 'SORTIE'] },
  { value: 'RETOUR_FOURNISSEUR', label: 'Retour Fournisseur', types: ['SORTIE'] }
];

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.scss']
})
export class StockComponent implements OnInit {
  activeTab = signal<'adjust' | 'history'>('adjust');

  products = signal<Product[]>([]);
  movements = signal<StockMovement[]>([]);
  categories = signal<Category[]>([]);
  boutiques = signal<Boutique[]>([]);

  adjustForm: FormGroup;
  productForm: FormGroup;
  isSaving = signal<boolean>(false);
  isSavingProduct = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  productFormError = signal<string | null>(null);

  selectedMovementType = signal<MovementType>('ENTREE');

  filteredReasons = computed(() => {
    const type = this.selectedMovementType();
    return MOTIF_OPTIONS.filter(m => m.types.includes(type));
  });

  historySearch = signal<string>('');
  historyTypeFilter = signal<string>('');
  warehouseFilter = signal<string>('ALL');
  authorFilter = signal<string>('');
  showModal = signal<boolean>(false);
  showProductModal = signal<boolean>(false);

  // Pagination Signals
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(4);

  filteredMovements = computed(() => {
    let list = this.movements();
    const search = this.historySearch().toLowerCase().trim();
    if (search) {
      list = list.filter(m => 
        m.product.name.toLowerCase().includes(search) || 
        m.product.reference.toLowerCase().includes(search) ||
        (m.note && m.note.toLowerCase().includes(search))
      );
    }
    const type = this.historyTypeFilter();
    if (type) {
      list = list.filter(m => m.type === type);
    }
    const warehouse = this.warehouseFilter();
    if (warehouse !== 'ALL') {
      if (warehouse === 'CENTRAL') {
        list = list.filter(m => !m.boutique);
      } else {
        const bId = Number(warehouse);
        list = list.filter(m => m.boutique && m.boutique.id === bId);
      }
    }
    const author = this.authorFilter();
    if (author) {
      list = list.filter(m => m.userEmail && m.userEmail.toLowerCase().includes(author.toLowerCase()));
    }
    return list;
  });

  totalPages = computed(() => Math.ceil(this.filteredMovements().length / this.itemsPerPage()) || 1);

  paginatedMovements = computed(() => {
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    return this.filteredMovements().slice(start, start + perPage);
  });

  openAdjustmentModal(): void {
    this.selectedMovementType.set('ENTREE');
    this.adjustForm.reset({ type: 'ENTREE', quantity: 1, reason: 'REAPPROVISIONNEMENT' });
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  openProductModal(): void {
    const count = this.products().length + 1;
    this.productForm.reset({
      reference: 'PROD-' + count.toString().padStart(5, '0'),
      name: '',
      description: '',
      buyPrice: 0,
      sellPrice: null,
      initialStock: 1,
      alertThreshold: 5,
      barcode: '',
      categoryId: null
    });
    this.productFormError.set(null);
    this.showProductModal.set(true);
  }

  closeProductModal(): void {
    this.showProductModal.set(false);
  }

  submitProduct(): void {
    if (this.productForm.invalid) return;

    this.isSavingProduct.set(true);
    this.productFormError.set(null);

    const val = this.productForm.value;
    this.productService.createProduct({
      reference: val.reference,
      name: val.name,
      description: val.description,
      buyPrice: Number(val.buyPrice),
      sellPrice: val.sellPrice ? Number(val.sellPrice) : undefined,
      initialStock: val.initialStock ? Number(val.initialStock) : 0,
      alertThreshold: val.alertThreshold ? Number(val.alertThreshold) : 5,
      barcode: val.barcode,
      categoryId: val.categoryId ? Number(val.categoryId) : undefined
    }).subscribe({
      next: (newProd) => {
        this.isSavingProduct.set(false);
        this.closeProductModal();
        this.loadProducts();
        this.loadMovements(); // Reload movements so initial stock movement shows up!
        this.adjustForm.patchValue({ productId: newProd.id });
      },
      error: (err) => {
        this.isSavingProduct.set(false);
        this.productFormError.set(err.message || 'Erreur lors de la création du produit');
      }
    });
  }

  updateAuthorFilter(e: Event): void {
    this.authorFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  updateWarehouseFilter(e: Event): void {
    this.warehouseFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  constructor(
    private productService: ProductService,
    private movementService: StockMovementService,
    private categoryService: CategoryService,
    private boutiqueService: BoutiqueService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.adjustForm = this.fb.group({
      productId: [null, Validators.required],
      type: ['ENTREE', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      reason: ['REAPPROVISIONNEMENT', Validators.required],
      note: ['']
    });

    this.productForm = this.fb.group({
      reference: [''],
      name: ['', Validators.required],
      description: [''],
      buyPrice: [0, [Validators.required, Validators.min(0)]],
      sellPrice: [null],
      initialStock: [1],
      alertThreshold: [5],
      barcode: [''],
      categoryId: [null]
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadMovements();
    this.loadCategories();
    this.loadBoutiques();

    this.adjustForm.get('type')?.valueChanges.subscribe((type: MovementType) => {
      if (type) {
        this.selectedMovementType.set(type);
        const validReasons = this.filteredReasons();
        const currentReason = this.adjustForm.get('reason')?.value;
        if (!validReasons.some(r => r.value === currentReason)) {
          this.adjustForm.patchValue({ reason: validReasons[0]?.value || '' });
        }
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['productId']) {
        this.adjustForm.patchValue({ productId: Number(params['productId']) });
        this.activeTab.set('adjust');
      }
    });
  }

  loadProducts(): void {
    this.productService.getAllProducts().subscribe(prods => this.products.set(prods));
  }

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe(cats => this.categories.set(cats));
  }

  loadBoutiques(): void {
    this.boutiqueService.getAllBoutiques().subscribe(b => this.boutiques.set(b));
  }

  loadMovements(): void {
    this.movementService.getAllStockMovements().subscribe(movs => this.movements.set(movs));
  }

  updateHistorySearch(e: Event): void {
    this.historySearch.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  updateHistoryType(e: Event): void {
    this.historyTypeFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  // Pagination Methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  updateItemsPerPage(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.itemsPerPage.set(val);
    this.currentPage.set(1);
  }

  submitAdjustment(): void {
    if (this.adjustForm.invalid) return;

    this.isSaving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const formVal = this.adjustForm.value;
    const req: StockAdjustmentRequest = {
      productId: Number(formVal.productId),
      quantity: Number(formVal.quantity),
      type: formVal.type as MovementType,
      reason: formVal.reason as MovementReason,
      note: formVal.note
    };

    this.productService.adjustStock(req).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.successMessage.set('Ajustement de stock enregistré avec succès !');
        this.selectedMovementType.set('ENTREE');
        this.adjustForm.reset({ type: 'ENTREE', quantity: 1, reason: 'REAPPROVISIONNEMENT' });
        this.closeModal();
        this.loadProducts();
        this.loadMovements();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.message || 'Erreur lors de l\'ajustement');
      }
    });
  }
}
