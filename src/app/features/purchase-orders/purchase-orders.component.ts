import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import { ProductService } from '../../core/services/product.service';
import { TiersService } from '../../core/services/tiers.service';
import { CategoryService } from '../../core/services/category.service';
import { PurchaseOrder, CreatePurchaseOrderRequest } from '../../core/models/purchase-order.model';
import { Product } from '../../core/models/product.model';
import { Tiers } from '../../core/models/tiers.model';
import { Category } from '../../core/models/category.model';

@Component({
  selector: 'app-purchase-orders',
  templateUrl: './purchase-orders.component.html',
  styleUrls: ['./purchase-orders.component.scss']
})
export class PurchaseOrdersComponent implements OnInit {
  ordersList = signal<PurchaseOrder[]>([]);
  products = signal<Product[]>([]);
  suppliers = signal<Tiers[]>([]);
  categories = signal<Category[]>([]);

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  searchTerm = signal<string>('');
  statusFilter = signal<string>('');
  showCreateModal = signal<boolean>(false);
  showDetailModal = signal<boolean>(false);
  showQuickProductModal = signal<boolean>(false);
  selectedOrderDetail = signal<PurchaseOrder | null>(null);

  orderForm: FormGroup;
  quickProductForm: FormGroup;
  isCreatingProduct = signal<boolean>(false);
  quickProductError = signal<string | null>(null);

  totalOrders = computed(() => this.ordersList().length);
  deliveredOrders = computed(() => this.ordersList().filter(o => o.status === 'LIVREE').length);

  filteredOrders = computed(() => {
    let list = this.ordersList();
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      list = list.filter(o =>
        o.reference.toLowerCase().includes(search) ||
        (o.supplierName && o.supplierName.toLowerCase().includes(search))
      );
    }
    const status = this.statusFilter();
    if (status) {
      list = list.filter(o => o.status === status);
    }
    return list;
  });

  constructor(
    private purchaseOrderService: PurchaseOrderService,
    private productService: ProductService,
    private tiersService: TiersService,
    private categoryService: CategoryService,
    private fb: FormBuilder
  ) {
    this.orderForm = this.fb.group({
      reference: [''],
      supplierId: [null, Validators.required],
      expectedDeliveryDate: [''],
      note: [''],
      items: this.fb.array([])
    });

    this.quickProductForm = this.fb.group({
      reference: [''],
      name: ['', Validators.required],
      description: [''],
      buyPrice: [0, [Validators.required, Validators.min(0)]],
      sellPrice: [null],
      initialStock: [0],
      alertThreshold: [5],
      barcode: [''],
      categoryId: [null]
    });
  }

  ngOnInit(): void {
    this.loadOrders();
    this.loadProducts();
    this.loadSuppliers();
    this.loadCategories();
  }

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe(cats => this.categories.set(cats));
  }

  get itemsFormArray(): FormArray {
    return this.orderForm.get('items') as FormArray;
  }

  addItemRow(): void {
    const itemGroup = this.fb.group({
      productId: [null, Validators.required],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
      quantityOrdered: [1, [Validators.required, Validators.min(1)]]
    });

    itemGroup.get('productId')?.valueChanges.subscribe(prodId => {
      const prod = this.products().find(p => p.id === Number(prodId));
      if (prod) {
        itemGroup.patchValue({ unitPrice: prod.buyPrice }, { emitEvent: false });
      }
    });

    this.itemsFormArray.push(itemGroup);
  }

  removeItemRow(index: number): void {
    this.itemsFormArray.removeAt(index);
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.purchaseOrderService.getAllPurchaseOrders().subscribe({
      next: (data) => {
        this.ordersList.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadProducts(): void {
    this.productService.getAllProducts().subscribe(prods => this.products.set(prods));
  }

  loadSuppliers(): void {
    this.tiersService.getAllTiers('FOURNISSEUR').subscribe(data => this.suppliers.set(data));
  }

  openQuickProductModal(): void {
    const count = this.products().length + 1;
    this.quickProductForm.reset({
      reference: 'PROD-' + count.toString().padStart(5, '0'),
      name: '',
      description: '',
      buyPrice: 0,
      sellPrice: null,
      initialStock: 0,
      alertThreshold: 5,
      barcode: '',
      categoryId: null
    });
    this.quickProductError.set(null);
    this.showQuickProductModal.set(true);
  }

  closeQuickProductModal(): void {
    this.showQuickProductModal.set(false);
  }

  submitQuickProduct(): void {
    if (this.quickProductForm.invalid) return;

    this.isCreatingProduct.set(true);
    this.quickProductError.set(null);

    const val = this.quickProductForm.value;
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
        this.isCreatingProduct.set(false);
        this.closeQuickProductModal();
        // Refresh product list
        this.loadProducts();

        // Automatically add an item line with this new product selected
        const itemGroup = this.fb.group({
          productId: [newProd.id, Validators.required],
          unitPrice: [newProd.buyPrice, [Validators.required, Validators.min(0)]],
          quantityOrdered: [1, [Validators.required, Validators.min(1)]]
        });
        itemGroup.get('productId')?.valueChanges.subscribe(prodId => {
          const prod = this.products().find(p => p.id === Number(prodId));
          if (prod) {
            itemGroup.patchValue({ unitPrice: prod.buyPrice }, { emitEvent: false });
          }
        });
        this.itemsFormArray.push(itemGroup);
      },
      error: (err) => {
        this.isCreatingProduct.set(false);
        this.quickProductError.set(err.message || 'Erreur lors de la création du produit');
      }
    });
  }

  openCreateModal(): void {
    this.orderForm.reset({
      reference: '',
      supplierId: null,
      expectedDeliveryDate: '',
      note: ''
    });
    this.itemsFormArray.clear();
    this.addItemRow(); // Add one default item row
    this.errorMessage.set(null);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  openDetailModal(order: PurchaseOrder): void {
    this.selectedOrderDetail.set(order);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
  }

  submitOrder(): void {
    if (this.orderForm.invalid || this.itemsFormArray.length === 0) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const val = this.orderForm.value;
    const req: CreatePurchaseOrderRequest = {
      reference: val.reference || undefined,
      supplierId: Number(val.supplierId),
      expectedDeliveryDate: val.expectedDeliveryDate || undefined,
      note: val.note,
      items: val.items.map((i: any) => ({
        productId: Number(i.productId),
        unitPrice: Number(i.unitPrice),
        quantityOrdered: Number(i.quantityOrdered)
      }))
    };

    this.purchaseOrderService.createPurchaseOrder(req).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeCreateModal();
        this.loadOrders();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || 'Erreur lors de la création de la commande.');
      }
    });
  }

  validateOrder(order: PurchaseOrder, event?: Event): void {
    if (event) event.stopPropagation();
    this.purchaseOrderService.validatePurchaseOrder(order.id).subscribe({
      next: () => this.loadOrders(),
      error: (err) => alert(err.error?.message || 'Erreur lors de la validation.')
    });
  }

  receiveDelivery(order: PurchaseOrder, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm(`Confirmer la réception de la livraison pour la commande "${order.reference}" ?\nCeci augmentera automatiquement le stock de l'entrepôt central.`)) {
      this.purchaseOrderService.receiveDelivery(order.id).subscribe({
        next: () => {
          alert('Livraison réceptionnée avec succès ! Le stock central a été mis à jour.');
          this.loadOrders();
          if (this.showDetailModal()) this.closeDetailModal();
        },
        error: (err) => alert(err.error?.message || 'Erreur lors de la réception.')
      });
    }
  }

  cancelOrder(order: PurchaseOrder, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm(`Êtes-vous sûr de vouloir annuler la commande "${order.reference}" ?`)) {
      this.purchaseOrderService.cancelPurchaseOrder(order.id).subscribe({
        next: () => this.loadOrders(),
        error: (err) => alert(err.error?.message || 'Erreur lors de l\'annulation.')
      });
    }
  }
}
