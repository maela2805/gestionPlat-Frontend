import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../core/services/product.service';
import { StockMovementService } from '../../core/services/stock-movement.service';
import { Product, StockAdjustmentRequest } from '../../core/models/product.model';
import { StockMovement, MovementType, MovementReason } from '../../core/models/stock-movement.model';

@Component({
  selector: 'app-stock',
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.scss']
})
export class StockComponent implements OnInit {
  activeTab = signal<'adjust' | 'history'>('adjust');

  products = signal<Product[]>([]);
  movements = signal<StockMovement[]>([]);

  adjustForm: FormGroup;
  isSaving = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  historySearch = signal<string>('');
  historyTypeFilter = signal<string>('');
  authorFilter = signal<string>('');
  showModal = signal<boolean>(false);

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
    const author = this.authorFilter();
    if (author) {
      list = list.filter(m => m.userEmail && m.userEmail.toLowerCase().includes(author.toLowerCase()));
    }
    return list;
  });

  openAdjustmentModal(): void {
    this.adjustForm.reset({ type: 'ENTREE', quantity: 1, reason: 'REAPPROVISIONNEMENT' });
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  updateAuthorFilter(e: Event): void {
    this.authorFilter.set((e.target as HTMLSelectElement).value);
  }

  constructor(
    private productService: ProductService,
    private movementService: StockMovementService,
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
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadMovements();

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

  loadMovements(): void {
    this.movementService.getAllStockMovements().subscribe(movs => this.movements.set(movs));
  }

  updateHistorySearch(e: Event): void {
    this.historySearch.set((e.target as HTMLInputElement).value);
  }

  updateHistoryType(e: Event): void {
    this.historyTypeFilter.set((e.target as HTMLSelectElement).value);
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
