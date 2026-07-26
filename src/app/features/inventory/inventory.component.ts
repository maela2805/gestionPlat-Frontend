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
  selected: boolean;
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
  modalSearchTerm = signal<string>('');
  inventoryNote = signal<string>('');

  // Active inventory counting rows for the selected warehouse
  inventoryRows = signal<InventoryRow[]>([]);

  showNewInventoryModal = signal<boolean>(false);
  showDetailModal = signal<boolean>(false);
  selectedInventoryDetail = signal<Inventory | null>(null);

  currentWarehouseName = computed(() => {
    const id = this.selectedWarehouseId();
    if (id === null) return 'Entrepôt Central (Dépôt Principal)';
    const b = this.boutiques().find(item => item.id === id);
    return b ? `Entrepôt ${b.name}` : 'Entrepôt Inconnu';
  });

  filteredModalRows = computed(() => {
    const search = this.modalSearchTerm().toLowerCase().trim();
    let rows = this.inventoryRows();
    if (search) {
      rows = rows.filter(r =>
        r.reference.toLowerCase().includes(search) ||
        r.designation.toLowerCase().includes(search)
      );
    }
    return rows;
  });

  selectedRowsCount = computed(() => {
    return this.inventoryRows().filter(r => r.selected).length;
  });

  totalTheoreticalStock = computed(() => {
    return this.inventoryRows()
      .filter(r => r.selected)
      .reduce((sum, r) => sum + r.theoreticalStock, 0);
  });

  totalPhysicalStock = computed(() => {
    return this.inventoryRows()
      .filter(r => r.selected)
      .reduce((sum, r) => sum + r.physicalStock, 0);
  });

  totalGapsCount = computed(() => {
    return this.inventoryRows()
      .filter(r => r.selected && (r.physicalStock - r.theoreticalStock) !== 0).length;
  });

  filteredInventories = computed(() => {
    const id = this.selectedWarehouseId();
    const search = this.searchTerm().toLowerCase().trim();
    let list = this.inventories();

    if (id === null) {
      list = list.filter(i => !i.boutique);
    } else {
      list = list.filter(i => i.boutique && i.boutique.id === id);
    }

    if (search) {
      list = list.filter(i =>
        i.reference.toLowerCase().includes(search) ||
        (i.note && i.note.toLowerCase().includes(search)) ||
        (i.userEmail && i.userEmail.toLowerCase().includes(search))
      );
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
    });
  }

  loadInventories(): void {
    this.inventoryService.getAllInventories().subscribe(data => this.inventories.set(data));
  }

  selectWarehouse(warehouseId: number | null): void {
    this.selectedWarehouseId.set(warehouseId);
  }

  openNewInventoryModal(): void {
    this.inventoryNote.set('');
    this.modalSearchTerm.set('');
    const warehouseId = this.selectedWarehouseId();

    if (warehouseId === null) {
      // Central Warehouse
      this.productService.getAllProducts().subscribe(prods => {
        this.products.set(prods);
        this.buildCentralInventoryRows(prods);
        this.showNewInventoryModal.set(true);
      });
    } else {
      // Boutique Warehouse
      this.isLoading.set(true);
      this.warehouseService.getStocksByBoutique(warehouseId).subscribe({
        next: (stocks) => {
          this.buildBoutiqueInventoryRows(stocks);
          this.isLoading.set(false);
          this.showNewInventoryModal.set(true);
        },
        error: () => this.isLoading.set(false)
      });
    }
  }

  closeNewInventoryModal(): void {
    this.showNewInventoryModal.set(false);
  }

  buildCentralInventoryRows(prods: Product[]): void {
    const rows: InventoryRow[] = prods.map(p => ({
      productId: p.id,
      reference: p.reference,
      designation: p.name,
      theoreticalStock: p.stock ?? 0,
      physicalStock: p.stock ?? 0,
      selected: true
    }));
    this.inventoryRows.set(rows);
  }

  buildBoutiqueInventoryRows(stocks: BoutiqueStockDTO[]): void {
    const rows: InventoryRow[] = stocks.map(s => ({
      productId: s.productId,
      reference: s.productReference,
      designation: s.productName,
      theoreticalStock: s.quantity,
      physicalStock: s.quantity,
      selected: true
    }));
    this.inventoryRows.set(rows);
  }

  toggleSelectAll(checked: boolean): void {
    const rows = this.inventoryRows().map(r => ({ ...r, selected: checked }));
    this.inventoryRows.set(rows);
  }

  toggleSelectRow(productId: number, checked: boolean): void {
    const rows = this.inventoryRows().map(r => {
      if (r.productId === productId) {
        return { ...r, selected: checked };
      }
      return r;
    });
    this.inventoryRows.set(rows);
  }

  updatePhysicalStock(productId: number, val: string): void {
    const num = Number(val);
    if (isNaN(num) || num < 0) return;

    const rows = this.inventoryRows().map(r => {
      if (r.productId === productId) {
        return { ...r, physicalStock: num };
      }
      return r;
    });
    this.inventoryRows.set(rows);
  }

  submitWarehouseInventory(validateDirectly: boolean = false): void {
    const selectedRows = this.inventoryRows().filter(r => r.selected);
    if (selectedRows.length === 0) {
      alert('Veuillez sélectionner au moins un produit à inclure dans l\'inventaire.');
      return;
    }

    this.isSaving.set(true);

    const itemsReq: InventoryItemRequest[] = selectedRows.map(r => ({
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
              this.showNewInventoryModal.set(false);
              this.loadInventories();
              this.loadProducts();
            },
            error: (err) => {
              this.isSaving.set(false);
              alert(err.error?.message || 'Erreur lors de la validation de l\'inventaire.');
            }
          });
        } else {
          this.isSaving.set(false);
          alert(`Brouillon d'inventaire ${createdInv.reference} enregistré avec succès !`);
          this.showNewInventoryModal.set(false);
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
          if (this.showDetailModal()) this.closeDetailModal();
        },
        error: (err) => alert(err.error?.message || 'Erreur lors de la validation.')
      });
    }
  }
}
