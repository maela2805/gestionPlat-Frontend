import { Component, OnInit, signal, computed } from '@angular/core';
import { InventoryService } from '../../core/services/inventory.service';
import { BoutiqueService } from '../../core/services/boutique.service';
import { ProductService } from '../../core/services/product.service';
import { Inventory, CreateInventoryRequest, InventoryItemRequest } from '../../core/models/inventory.model';
import { Boutique } from '../../core/models/boutique.model';
import { Product } from '../../core/models/product.model';

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {
  Number = Number;

  inventories = signal<Inventory[]>([]);
  boutiques = signal<Boutique[]>([]);
  products = signal<Product[]>([]);

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  selectedBoutiqueFilter = signal<number | null>(null);

  showCreateModal = signal<boolean>(false);
  showDetailModal = signal<boolean>(false);

  selectedBoutiqueId = signal<number | null>(null);
  inventoryNote = signal<string>('');
  selectedInventoryDetail = signal<Inventory | null>(null);

  // Form items for new inventory
  inventoryCounts = signal<{ product: Product; countedQty: number }[]>([]);

  filteredInventories = computed(() => {
    const filter = this.selectedBoutiqueFilter();
    let list = this.inventories();
    if (filter) {
      list = list.filter(i => i.boutique && i.boutique.id === filter);
    }
    return list;
  });

  totalInventories = computed(() => this.inventories().length);
  validatedInventories = computed(() => this.inventories().filter(i => i.status === 'VALIDE').length);

  constructor(
    private inventoryService: InventoryService,
    private boutiqueService: BoutiqueService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.loadInventories();
    this.loadBoutiques();
    this.loadProducts();
  }

  loadInventories(): void {
    this.isLoading.set(true);
    this.inventoryService.getAllInventories().subscribe({
      next: (data) => {
        this.inventories.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadBoutiques(): void {
    this.boutiqueService.getAllBoutiques().subscribe(data => this.boutiques.set(data));
  }

  loadProducts(): void {
    this.productService.getAllProducts().subscribe(prods => this.products.set(prods));
  }

  openCreateModal(): void {
    this.selectedBoutiqueId.set(this.boutiques().length > 0 ? this.boutiques()[0].id : null);
    this.inventoryNote.set('');
    
    // Initialize count rows with products
    const counts = this.products().map(p => ({
      product: p,
      countedQty: p.stock ?? 0
    }));
    this.inventoryCounts.set(counts);
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  updateCount(index: number, newCount: number): void {
    const counts = [...this.inventoryCounts()];
    counts[index].countedQty = Math.max(0, newCount);
    this.inventoryCounts.set(counts);
  }

  submitInventory(): void {
    const boutiqueId = this.selectedBoutiqueId();
    if (!boutiqueId) {
      alert('Veuillez sélectionner un entrepôt / boutique.');
      return;
    }

    this.isSaving.set(true);

    const itemsReq: InventoryItemRequest[] = this.inventoryCounts().map(c => ({
      productId: c.product.id,
      countedQuantity: c.countedQty
    }));

    const req: CreateInventoryRequest = {
      boutiqueId: Number(boutiqueId),
      note: this.inventoryNote(),
      items: itemsReq
    };

    this.inventoryService.createInventory(req).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.closeCreateModal();
        this.loadInventories();
      },
      error: (err) => {
        this.isSaving.set(false);
        alert(err.error?.message || 'Erreur lors de la création de l\'inventaire.');
      }
    });
  }

  openDetailModal(inv: Inventory): void {
    this.selectedInventoryDetail.set(inv);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
  }

  validateInventory(inv: Inventory, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm(`Confirmer la validation de l'inventaire "${inv.reference}" ?\nCeci ajustera automatiquement le stock de chaque produit.`)) {
      this.inventoryService.validateInventory(inv.id).subscribe({
        next: () => {
          alert('Inventaire validé avec succès ! Les stocks ont été ajustés.');
          this.loadInventories();
          if (this.showDetailModal()) this.closeDetailModal();
        },
        error: (err) => alert(err.error?.message || 'Erreur lors de la validation.')
      });
    }
  }
}
