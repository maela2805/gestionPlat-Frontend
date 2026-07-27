import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { StoreSaleService } from '../../core/services/store-sale.service';
import { ProductService } from '../../core/services/product.service';
import { BoutiqueService } from '../../core/services/boutique.service';
import { StoreSale, CreateStoreSaleRequest } from '../../core/models/store-sale.model';
import { Product } from '../../core/models/product.model';
import { Boutique, BoutiquePrice } from '../../core/models/boutique.model';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-store-sales',
  templateUrl: './store-sales.component.html',
  styleUrls: ['./store-sales.component.scss']
})
export class StoreSalesComponent implements OnInit {
  salesList = signal<StoreSale[]>([]);
  products = signal<Product[]>([]);
  boutiques = signal<Boutique[]>([]);
  selectedBoutiquePrices = signal<BoutiquePrice[]>([]);

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  searchTerm = signal<string>('');
  statusFilter = signal<string>('');
  showCreateModal = signal<boolean>(false);
  showDetailModal = signal<boolean>(false);
  selectedSaleDetail = signal<StoreSale | null>(null);

  saleForm: FormGroup;

  totalSales = computed(() => this.filteredSales().length);
  validatedSales = computed(() => this.filteredSales().filter(s => s.status === 'VALIDEE').length);
  totalRevenue = computed(() => this.filteredSales()
    .filter(s => s.status === 'VALIDEE')
    .reduce((sum, s) => sum + (s.totalAmount || 0), 0)
  );

  filteredSales = computed(() => {
    let list = this.salesList();
    const user = this.authService.currentUser();
    const isEmp = user && user.boutiqueId && (user.roleName === 'ROLE_EMPLOYEE' || user.roleName === 'EMPLOYEE');

    if (isEmp) {
      list = list.filter(s => s.boutiqueId === user.boutiqueId);
    }

    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      list = list.filter(s =>
        s.reference.toLowerCase().includes(search) ||
        (s.boutiqueName && s.boutiqueName.toLowerCase().includes(search))
      );
    }
    const status = this.statusFilter();
    if (status) {
      list = list.filter(s => s.status === status);
    }
    return list;
  });

  constructor(
    private storeSaleService: StoreSaleService,
    private productService: ProductService,
    private boutiqueService: BoutiqueService,
    public authService: AuthService,
    private fb: FormBuilder
  ) {
    this.saleForm = this.fb.group({
      reference: [''],
      boutiqueId: [null, Validators.required],
      note: [''],
      items: this.fb.array([])
    });

    this.saleForm.get('boutiqueId')?.valueChanges.subscribe(btqId => {
      if (btqId) {
        this.loadPricesForBoutique(Number(btqId));
      }
    });
  }

  ngOnInit(): void {
    this.loadSales();
    this.loadProducts();
    this.loadBoutiques();
  }

  get itemsFormArray(): FormArray {
    return this.saleForm.get('items') as FormArray;
  }

  addItemRow(): void {
    const itemGroup = this.fb.group({
      productId: [null, Validators.required],
      wholesalePrice: [0, [Validators.required, Validators.min(0)]],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });

    itemGroup.get('productId')?.valueChanges.subscribe(prodId => {
      const pId = Number(prodId);
      const boutiquePrice = this.selectedBoutiquePrices().find(bp => bp.productId === pId);
      if (boutiquePrice) {
        itemGroup.patchValue({ wholesalePrice: boutiquePrice.wholesalePrice }, { emitEvent: false });
      } else {
        const prod = this.products().find(p => p.id === pId);
        if (prod) {
          itemGroup.patchValue({ wholesalePrice: prod.sellPrice }, { emitEvent: false });
        }
      }
    });

    this.itemsFormArray.push(itemGroup);
  }

  removeItemRow(index: number): void {
    this.itemsFormArray.removeAt(index);
  }

  loadSales(): void {
    this.isLoading.set(true);
    this.storeSaleService.getAllStoreSales().subscribe({
      next: (data) => {
        this.salesList.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadProducts(): void {
    this.productService.getAllProducts().subscribe(prods => this.products.set(prods));
  }

  loadBoutiques(): void {
    this.boutiqueService.getAllBoutiques().subscribe(b => this.boutiques.set(b));
  }

  loadPricesForBoutique(boutiqueId: number): void {
    this.boutiqueService.getBoutiquePrices(boutiqueId).subscribe(prices => {
      this.selectedBoutiquePrices.set(prices);
    });
  }

  openCreateModal(): void {
    const user = this.authService.currentUser();
    const defaultBoutiqueId = (user && user.boutiqueId && (user.roleName === 'ROLE_EMPLOYEE' || user.roleName === 'EMPLOYEE')) ? user.boutiqueId : null;

    this.saleForm.reset({
      reference: '',
      boutiqueId: defaultBoutiqueId,
      note: ''
    });
    this.itemsFormArray.clear();
    this.addItemRow();
    this.errorMessage.set(null);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  openDetailModal(sale: StoreSale): void {
    this.selectedSaleDetail.set(sale);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
  }

  submitSale(): void {
    if (this.saleForm.invalid || this.itemsFormArray.length === 0) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const val = this.saleForm.value;
    const req: CreateStoreSaleRequest = {
      reference: val.reference || undefined,
      boutiqueId: Number(val.boutiqueId),
      note: val.note,
      items: val.items.map((i: any) => ({
        productId: Number(i.productId),
        wholesalePrice: Number(i.wholesalePrice),
        quantity: Number(i.quantity)
      }))
    };

    this.storeSaleService.createStoreSale(req).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeCreateModal();
        this.loadSales();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors de la création de la vente.');
      }
    });
  }

  validateSale(sale: StoreSale, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm(`Confirmer la livraison/expédition pour la boutique "${sale.boutiqueName}" ?\nCeci déduira automatiquement les quantités du stock central (Sortie de stock).`)) {
      this.storeSaleService.validateStoreSale(sale.id).subscribe({
        next: () => {
          alert('Vente validée ! Les stocks de l\'entrepôt central ont été déduits.');
          this.loadSales();
          if (this.showDetailModal()) this.closeDetailModal();
        },
        error: (err) => alert(err.error?.message || 'Erreur lors de la validation.')
      });
    }
  }

  cancelSale(sale: StoreSale, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm(`Êtes-vous sûr de vouloir annuler la vente "${sale.reference}" ?`)) {
      this.storeSaleService.cancelStoreSale(sale.id).subscribe({
        next: () => this.loadSales(),
        error: (err) => alert(err.error?.message || 'Erreur lors de l\'annulation.')
      });
    }
  }
}
