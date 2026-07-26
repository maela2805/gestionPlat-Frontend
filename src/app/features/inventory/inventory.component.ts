import { Component, OnInit, signal, computed } from '@angular/core';
import { InventoryService } from '../../core/services/inventory.service';
import { BoutiqueService } from '../../core/services/boutique.service';
import { ProductService } from '../../core/services/product.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import { Inventory, CreateInventoryRequest, InventoryItemRequest } from '../../core/models/inventory.model';
import { Boutique } from '../../core/models/boutique.model';
import { Product } from '../../core/models/product.model';
import { BoutiqueStockDTO } from '../../core/models/warehouse.model';

export interface InventoryRow {
  productId: number;
  reference: string;
  designation: string;
  theoreticalStock: number;
  physicalStock: number;
}

@Component({
  selector: 'app-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {
  Number = Number;

  boutiques = signal<Boutique[]>([]);
  products = signal<Product[]>([]);
  inventories = signal<Inventory[]>([]);

  // Selected warehouse: null = Entrepôt Central, number = Boutique ID
  selectedWarehouseId = signal<number | null>(null);

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  searchTerm = signal<string>('');
  inventoryNote = signal<string>('');

  // Active inventory counting rows for the selected warehouse
  inventoryRows = signal<InventoryRow[]>([]);

  showDetailModal = signal<boolean>(false);
  selectedInventoryDetail = signal<Inventory | null>(null);

  currentWarehouseName = computed(() => {
    const id = this.selectedWarehouseId();
    if (id === null) return 'Entrepôt Central (Dépôt Principal)';
    const b = this.boutiques().find(item => item.id === id);
    return b ? `Entrepôt ${b.name}` : 'Entrepôt Inconnu';
  });

  filteredRows = computed(() => {
    const search = this.searchTerm().toLowerCase().trim();
    let rows = this.inventoryRows();
    if (search) {
      rows = rows.filter(r =>
        r.reference.toLowerCase().includes(search) ||
        r.designation.toLowerCase().includes(search)
      );
    }
    return rows;
  });

  totalTheoreticalStock = computed(() => {
    return this.filteredRows().reduce((sum, r) => sum + r.theoreticalStock, 0);
  });

  totalPhysicalStock = computed(() => {
    return this.filteredRows().reduce((sum, r) => sum + r.physicalStock, 0);
  });

  totalGapsCount = computed(() => {
    return this.filteredRows().filter(r => (r.physicalStock - r.theoreticalStock) !== 0).length;
  });

  filteredInventories = computed(() => {
    const id = this.selectedWarehouseId();
    let list = this.inventories();
    if (id === null) {
      list = list.filter(i => !i.boutique);
    } else {
      list = list.filter(i => i.boutique && i.boutique.id === id);
    }
    return list;
  });

  constructor(
    private inventoryService: InventoryService,
    private boutiqueService: BoutiqueService,
    private productService: ProductService,
    private warehouseService: WarehouseService
  ) {}

  ngOnInit(): void {
    this.loadBoutiques();
    this.loadProducts();
    this.loadInventories();
  }

  loadBoutiques(): void {
    this.boutiqueService.getAllBoutiques().subscribe(data => {
      this.boutiques.set(data);
      this.selectWarehouse(null);
    });
  }

  loadProducts(): void {
    this.productService.getAllProducts().subscribe(prods => {
      this.products.set(prods);
      if (this.selectedWarehouseId() === null) {
        this.buildCentralInventoryRows(prods);
      }
    });
  }

  loadInventories(): void {
    this.inventoryService.getAllInventories().subscribe(data => this.inventories.set(data));
  }

  selectWarehouse(warehouseId: number | null): void {
    this.selectedWarehouseId.set(warehouseId);
    this.inventoryNote.set('');

    if (warehouseId === null) {
      // Central Warehouse
      this.buildCentralInventoryRows(this.products());
    } else {
      // Boutique Warehouse
      this.isLoading.set(true);
      this.warehouseService.getStocksByBoutique(warehouseId).subscribe({
        next: (stocks) => {
          this.buildBoutiqueInventoryRows(stocks);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      });
    }
  }

  buildCentralInventoryRows(prods: Product[]): void {
    const rows: InventoryRow[] = prods.map(p => ({
      productId: p.id,
      reference: p.reference,
      designation: p.name,
      theoreticalStock: p.stock ?? 0,
      physicalStock: p.stock ?? 0
    }));
    this.inventoryRows.set(rows);
  }

  buildBoutiqueInventoryRows(stocks: BoutiqueStockDTO[]): void {
    const rows: InventoryRow[] = stocks.map(s => ({
      productId: s.productId,
      reference: s.productReference,
      designation: s.productName,
      theoreticalStock: s.quantity,
      physicalStock: s.quantity
    }));
    this.inventoryRows.set(rows);
  }

  updatePhysicalStock(index: number, val: string): void {
    const num = Number(val);
    if (isNaN(num) || num < 0) return;

    const rows = [...this.inventoryRows()];
    rows[index].physicalStock = num;
    this.inventoryRows.set(rows);
  }

  submitWarehouseInventory(validateDirectly: boolean = false): void {
    const rows = this.inventoryRows();
    if (rows.length === 0) {
      alert('Aucun produit disponible pour cet inventaire.');
      return;
    }

    this.isSaving.set(true);

    const itemsReq: InventoryItemRequest[] = rows.map(r => ({
      productId: r.productId,
      countedQuantity: r.physicalStock
    }));

    const wId = this.selectedWarehouseId();
    const req: CreateInventoryRequest = {
      boutiqueId: wId ? Number(wId) : undefined,
      note: this.inventoryNote() || `Inventaire ${this.currentWarehouseName()}`,
      items: itemsReq
    };

    this.inventoryService.createInventory(req).subscribe({
      next: (createdInv) => {
        if (validateDirectly) {
          this.inventoryService.validateInventory(createdInv.id).subscribe({
            next: () => {
              this.isSaving.set(false);
              alert(`Inventaire ${createdInv.reference} créé et validé avec succès ! Les stocks ont été mis à jour.`);
              this.loadInventories();
              this.loadProducts();
              this.selectWarehouse(wId);
            },
            error: (err) => {
              this.isSaving.set(false);
              alert(err.error?.message || 'Erreur lors de la validation de l\'inventaire.');
            }
          });
        } else {
          this.isSaving.set(false);
          alert(`Brouillon d'inventaire ${createdInv.reference} enregistré avec succès !`);
          this.loadInventories();
        }
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

  validateInventoryFromList(inv: Inventory, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm(`Confirmer la validation de l'inventaire "${inv.reference}" ?\nCeci ajustera définitivement le stock de chaque produit.`)) {
      this.inventoryService.validateInventory(inv.id).subscribe({
        next: () => {
          alert('Inventaire validé avec succès ! Les stocks ont été ajustés.');
          this.loadInventories();
          this.loadProducts();
          this.selectWarehouse(this.selectedWarehouseId());
          if (this.showDetailModal()) this.closeDetailModal();
        },
        error: (err) => alert(err.error?.message || 'Erreur lors de la validation.')
      });
    }
  }
}
