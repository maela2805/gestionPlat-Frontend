import { Component, OnInit, signal, computed } from '@angular/core';
import { WarehouseService } from '../../core/services/warehouse.service';
import { BoutiqueService } from '../../core/services/boutique.service';
import { ProductService } from '../../core/services/product.service';
import { BoutiqueStockDTO, TransferStockRequest } from '../../core/models/warehouse.model';
import { Boutique } from '../../core/models/boutique.model';
import { Product } from '../../core/models/product.model';
import { AuthService } from '../../core/services/auth.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-warehouses',
  templateUrl: './warehouses.component.html',
  styleUrls: ['./warehouses.component.scss']
})
export class WarehousesComponent implements OnInit {
  Number = Number;

  boutiques = signal<Boutique[]>([]);
  products = signal<Product[]>([]);
  warehouseStocks = signal<BoutiqueStockDTO[]>([]);

  // selectedWarehouseId: null = Entrepôt Central, number = Boutique ID
  selectedWarehouseId = signal<number | null>(null);

  isLoading = signal<boolean>(false);
  isTransferring = signal<boolean>(false);
  searchTerm = signal<string>('');

  showTransferModal = signal<boolean>(false);

  // Transfer Form State
  fromWarehouseId = signal<number | null>(null);
  toWarehouseId = signal<number | null>(null);
  selectedProductId = signal<number | null>(null);
  transferQuantity = signal<number>(1);
  transferNote = signal<string>('');
  fromWarehouseStocks = signal<BoutiqueStockDTO[]>([]);
  isLoadingFromWarehouseStocks = signal<boolean>(false);

  isEmployeeLocked = computed(() => {
    const u = this.authService.currentUser();
    return !!(u && u.boutiqueId && (u.roleName === 'ROLE_EMPLOYEE' || u.roleName === 'EMPLOYEE'));
  });

  currentWarehouseName = computed(() => {
    const id = this.selectedWarehouseId();
    if (id === null) return 'Entrepôt Central';
    const b = this.boutiques().find(item => item.id === id);
    return b ? `Entrepôt ${b.name}` : 'Entrepôt Inconnu';
  });

  filteredStocks = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    const id = this.selectedWarehouseId();

    if (id === null) {
      // Entrepôt Central -> Uses Product.stock
      let list = this.products().map(p => ({
        id: p.id,
        boutiqueId: 0,
        boutiqueName: 'Entrepôt Central',
        productId: p.id,
        productName: p.name,
        productReference: p.reference,
        quantity: p.stock ?? 0,
        buyPrice: p.buyPrice,
        sellPrice: p.sellPrice,
        alertThreshold: p.alertThreshold
      }));

      if (search) {
        list = list.filter(p =>
          p.productName.toLowerCase().includes(search) ||
          p.productReference.toLowerCase().includes(search)
        );
      }
      return list;
    } else {
      // Boutique Warehouse -> Seuls les articles ayant un stock dans cet entrepôt sont affichés
      let list = this.warehouseStocks().filter(p => (p.quantity ?? 0) > 0);
      if (search) {
        list = list.filter(p =>
          p.productName.toLowerCase().includes(search) ||
          p.productReference.toLowerCase().includes(search)
        );
      }
      return list;
    }
  });

  totalItemsInWarehouse = computed(() => {
    return this.filteredStocks().reduce((sum, item) => sum + item.quantity, 0);
  });

  lowStockItemsCount = computed(() => {
    return this.filteredStocks().filter(item => item.quantity <= (item.alertThreshold || 5)).length;
  });

  constructor(
    private warehouseService: WarehouseService,
    private boutiqueService: BoutiqueService,
    private productService: ProductService,
    public authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const param = this.route.snapshot.queryParamMap.get('boutiqueId');
    const targetBoutiqueId = param ? Number(param) : null;
    this.loadBoutiques(targetBoutiqueId);
    this.loadProducts();
  }

  loadBoutiques(initialBoutiqueId: number | null = null): void {
    const user = this.authService.currentUser();
    const isEmp = user && user.boutiqueId && (user.roleName === 'ROLE_EMPLOYEE' || user.roleName === 'EMPLOYEE');

    this.boutiqueService.getAllBoutiques().subscribe(data => {
      this.boutiques.set(data);

      if (isEmp) {
        this.selectedWarehouseId.set(user.boutiqueId!);
        this.loadWarehouseStock(user.boutiqueId!);
      } else if (data.length > 0) {
        const idToSelect = initialBoutiqueId !== null && data.some(b => b.id === initialBoutiqueId)
          ? initialBoutiqueId
          : data[0].id;
        this.selectedWarehouseId.set(idToSelect);
        if (idToSelect !== null) {
          this.loadWarehouseStock(idToSelect);
        }
      }
    });
  }

  loadProducts(): void {
    this.productService.getAllProducts().subscribe(prods => this.products.set(prods));
  }

  onWarehouseChange(val: any): void {
    const id = val === null || val === 'null' ? null : Number(val);
    this.selectedWarehouseId.set(id);
    if (id !== null) {
      this.loadWarehouseStock(id);
    }
  }

  loadWarehouseStock(boutiqueId: number): void {
    this.isLoading.set(true);
    this.warehouseService.getStocksByBoutique(boutiqueId).subscribe({
      next: (data) => {
        this.warehouseStocks.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  onFromWarehouseChange(val: any): void {
    const id = (val === null || val === 'null' || val === undefined) ? null : Number(val);
    this.fromWarehouseId.set(id);

    if (id === null) {
      this.fromWarehouseStocks.set([]);
      if (this.products().length > 0) {
        this.selectedProductId.set(this.products()[0].id);
      } else {
        this.selectedProductId.set(null);
      }
    } else {
      this.isLoadingFromWarehouseStocks.set(true);
      this.warehouseService.getStocksByBoutique(id).subscribe({
        next: (stocks) => {
          // Afficher seulement les articles qui ont une quantité disponible (> 0) dans cet entrepôt secondaire
          const availableStocks = stocks.filter(s => (s.quantity ?? 0) > 0);
          this.fromWarehouseStocks.set(availableStocks);
          this.isLoadingFromWarehouseStocks.set(false);

          if (availableStocks.length > 0) {
            this.selectedProductId.set(availableStocks[0].productId);
          } else {
            this.selectedProductId.set(null);
          }
        },
        error: () => {
          this.fromWarehouseStocks.set([]);
          this.isLoadingFromWarehouseStocks.set(false);
          this.selectedProductId.set(null);
        }
      });
    }
  }

  onToWarehouseChange(val: any): void {
    const id = (val === null || val === 'null' || val === undefined) ? null : Number(val);
    this.toWarehouseId.set(id);
  }

  onProductChange(val: any): void {
    const id = (val === null || val === 'null' || val === undefined) ? null : Number(val);
    this.selectedProductId.set(id);
  }

  openTransferModal(): void {
    const currentWarehouse = this.selectedWarehouseId();
    const defaultFrom = currentWarehouse;

    let defaultTo: number | null = null;
    if (defaultFrom === null) {
      defaultTo = this.boutiques().length > 0 ? this.boutiques()[0].id : null;
    } else {
      defaultTo = null; // Entrepôt Central
    }

    this.toWarehouseId.set(defaultTo);
    this.transferQuantity.set(1);
    this.transferNote.set('');
    this.showTransferModal.set(true);

    this.onFromWarehouseChange(defaultFrom);
  }

  closeTransferModal(): void {
    this.showTransferModal.set(false);
  }

  submitTransfer(): void {
    const prodId = this.selectedProductId();
    const qty = this.transferQuantity();

    if (!prodId || qty <= 0) {
      alert('Veuillez sélectionner un produit valide et saisir une quantité supérieure à zero.');
      return;
    }

    if (this.fromWarehouseId() === this.toWarehouseId()) {
      alert('L\'entrepôt de départ et d\'arrivée doivent être différents.');
      return;
    }

    this.isTransferring.set(true);

    const req: TransferStockRequest = {
      fromBoutiqueId: this.fromWarehouseId(),
      toBoutiqueId: this.toWarehouseId(),
      productId: Number(prodId),
      quantity: Number(qty),
      note: this.transferNote()
    };

    this.warehouseService.transferStock(req).subscribe({
      next: () => {
        this.isTransferring.set(false);
        alert('Transfert de stock effectué avec succès !');
        this.closeTransferModal();
        this.loadProducts();
        if (this.selectedWarehouseId() !== null) {
          this.loadWarehouseStock(this.selectedWarehouseId()!);
        }
      },
      error: (err) => {
        this.isTransferring.set(false);
        const errorMsg = typeof err.error === 'string' ? err.error : (err.error?.message || err.message || 'Erreur lors du transfert de stock.');
        alert(errorMsg);
      }
    });
  }
}
