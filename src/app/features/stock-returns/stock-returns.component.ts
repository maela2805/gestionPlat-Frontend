import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { StockReturnService } from '../../core/services/stock-return.service';
import { BoutiqueService } from '../../core/services/boutique.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import { AuthService } from '../../core/services/auth.service';
import { UploadService } from '../../core/services/upload.service';

import {
  StockReturn,
  StockReturnStatus,
  StockReturnType,
  CreateStockReturnRequest,
  CreateStockReturnItemRequest
} from '../../core/models/stock-return.model';
import { Boutique } from '../../core/models/boutique.model';
import { BoutiqueStockDTO } from '../../core/models/warehouse.model';

export interface DraftItem {
  product: BoutiqueStockDTO;
  quantity: number;
  unitPrice: number;
  note: string;
}

@Component({
  selector: 'app-stock-returns',
  templateUrl: './stock-returns.component.html',
  styleUrls: ['./stock-returns.component.scss']
})
export class StockReturnsComponent implements OnInit {
  private stockReturnService = inject(StockReturnService);
  private boutiqueService = inject(BoutiqueService);
  private warehouseService = inject(WarehouseService);
  private uploadService = inject(UploadService);
  public authService = inject(AuthService);

  returnsList = signal<StockReturn[]>([]);
  boutiques = signal<Boutique[]>([]);
  boutiqueStocks = signal<BoutiqueStockDTO[]>([]);

  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isUploading = signal<boolean>(false);

  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Filters
  searchTerm = signal<string>('');
  selectedBoutiqueId = signal<number | null>(null);
  selectedStatusFilter = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(8);

  // Modals
  showCreateModal = signal<boolean>(false);
  showDetailModal = signal<boolean>(false);
  showRejectModal = signal<boolean>(false);
  showMediaViewerModal = signal<boolean>(false);

  selectedReturnDetail = signal<StockReturn | null>(null);
  selectedMediaUrl = signal<string | null>(null);

  // Create Form State
  formBoutiqueId: number | null = null;
  formType: StockReturnType = 'CASSE';
  formDescription: string = '';
  formMediaUrls: string[] = [];

  draftItems: DraftItem[] = [];
  selectedProductIdToAdd: number | null = null;
  addQuantityInput: number = 1;
  addNoteInput: string = '';

  rejectionReasonInput: string = '';

  ngOnInit(): void {
    this.loadBoutiques();
    this.loadReturns();
  }

  get isAdmin(): boolean {
    return this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
  }

  loadBoutiques(): void {
    this.boutiqueService.getAllBoutiques().subscribe({
      next: (data) => {
        this.boutiques.set(data);
        const user = this.authService.currentUser();
        if (!this.isAdmin && user && user.boutiqueId) {
          this.formBoutiqueId = user.boutiqueId;
        } else if (data.length > 0 && !this.formBoutiqueId) {
          this.formBoutiqueId = data[0].id;
        }
      },
      error: (err) => console.error(err)
    });
  }

  loadReturns(): void {
    this.isLoading.set(true);
    const boutiqueId = this.selectedBoutiqueId() || undefined;
    const status = (this.selectedStatusFilter() as StockReturnStatus) || undefined;

    this.stockReturnService.getAllStockReturns(boutiqueId, status).subscribe({
      next: (data) => {
        this.returnsList.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.showError('Erreur lors du chargement des déclarations de casse/retour.');
        this.isLoading.set(false);
      }
    });
  }

  onBoutiqueFilterChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedBoutiqueId.set(val ? Number(val) : null);
    this.loadReturns();
  }

  // Filtered computed signals
  filteredReturns = computed(() => {
    let list = this.returnsList();
    const search = this.searchTerm().toLowerCase().trim();

    if (search) {
      list = list.filter(r =>
        r.reference.toLowerCase().includes(search) ||
        r.boutiqueName.toLowerCase().includes(search) ||
        r.userEmail.toLowerCase().includes(search) ||
        (r.description && r.description.toLowerCase().includes(search))
      );
    }
    return list;
  });

  // Stats
  totalCount = computed(() => this.returnsList().length);
  pendingCount = computed(() => this.returnsList().filter(r => r.status === 'PENDING').length);
  approvedCount = computed(() => this.returnsList().filter(r => r.status === 'APPROVED').length);
  rejectedCount = computed(() => this.returnsList().filter(r => r.status === 'REJECTED').length);

  totalPages = computed(() => Math.ceil(this.filteredReturns().length / this.itemsPerPage()) || 1);

  paginatedReturns = computed(() => {
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    return this.filteredReturns().slice(start, start + perPage);
  });

  // Create Modal & Stock Loading
  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.draftItems = [];
    this.formDescription = '';
    this.formMediaUrls = [];
    this.formType = 'CASSE';

    const user = this.authService.currentUser();
    if (!this.isAdmin && user && user.boutiqueId) {
      this.formBoutiqueId = user.boutiqueId;
    } else if (this.boutiques().length > 0 && !this.formBoutiqueId) {
      this.formBoutiqueId = this.boutiques()[0].id;
    }
    this.onFormBoutiqueChange();
  }

  onFormBoutiqueChange(): void {
    if (!this.formBoutiqueId) return;
    this.warehouseService.getStocksByBoutique(this.formBoutiqueId).subscribe({
      next: (stocks) => this.boutiqueStocks.set(stocks),
      error: (err) => console.error(err)
    });
  }

  addItemToDraft(): void {
    if (!this.selectedProductIdToAdd) {
      this.showError('Veuillez choisir un produit à ajouter.');
      return;
    }
    const bs = this.boutiqueStocks().find(s => s.productId === Number(this.selectedProductIdToAdd));
    if (!bs) return;

    if (this.addQuantityInput <= 0) {
      this.showError('La quantité doit être supérieure à 0.');
      return;
    }

    const existing = this.draftItems.find(i => i.product.productId === bs.productId);
    if (existing) {
      existing.quantity += this.addQuantityInput;
    } else {
      this.draftItems.push({
        product: bs,
        quantity: this.addQuantityInput,
        unitPrice: bs.sellPrice || 0,
        note: this.addNoteInput
      });
    }

    this.selectedProductIdToAdd = null;
    this.addQuantityInput = 1;
    this.addNoteInput = '';
  }

  removeDraftItem(item: DraftItem): void {
    this.draftItems = this.draftItems.filter(i => i !== item);
  }

  // Media Upload Handling
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isUploading.set(true);

    this.uploadService.uploadMedia(file).subscribe({
      next: (res) => {
        this.isUploading.set(false);
        this.formMediaUrls.push(res.url);
        this.showSuccess('Fichier téléversé avec succès !');
      },
      error: (err) => {
        this.isUploading.set(false);
        this.showError('Erreur lors du téléversement du fichier.');
      }
    });
  }

  removeMediaUrl(url: string): void {
    this.formMediaUrls = this.formMediaUrls.filter(u => u !== url);
  }

  submitCreate(): void {
    if (!this.formBoutiqueId) {
      this.showError('Veuillez sélectionner une boutique.');
      return;
    }

    if (this.draftItems.length === 0) {
      this.showError('Veuillez ajouter au moins un produit endommagé ou cassé.');
      return;
    }

    const req: CreateStockReturnRequest = {
      boutiqueId: Number(this.formBoutiqueId),
      type: this.formType,
      description: this.formDescription,
      mediaUrls: this.formMediaUrls,
      items: this.draftItems.map(i => ({
        productId: i.product.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        note: i.note
      }))
    };

    this.isSaving.set(true);
    this.stockReturnService.createStockReturn(req).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.showCreateModal.set(false);
        this.showSuccess(`Déclaration de casse/retour créée avec succès ! (Réf: ${res.reference})`);
        this.loadReturns();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.showError(err.error?.message || 'Erreur lors de la création de la déclaration.');
      }
    });
  }

  // Detail & Approval Actions
  openDetailModal(ret: StockReturn): void {
    this.selectedReturnDetail.set(ret);
    this.showDetailModal.set(true);
  }

  openMediaViewer(url: string): void {
    this.selectedMediaUrl.set(url);
    this.showMediaViewerModal.set(true);
  }

  isVideoUrl(url: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || url.includes('/video/upload/');
  }

  approveReturn(ret: StockReturn): void {
    if (!confirm(`Êtes-vous sûr de vouloir APPROUVER cette déclaration (${ret.reference}) ? Les stocks de la boutique ${ret.boutiqueName} seront automatiquement déduits.`)) {
      return;
    }

    this.isSaving.set(true);
    this.stockReturnService.approveStockReturn(ret.id).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        this.selectedReturnDetail.set(updated);
        this.showSuccess(`Déclaration ${updated.reference} APPROUVÉE ! Les stocks ont été déduits.`);
        this.loadReturns();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.showError(err.error?.message || 'Erreur lors de l\'approbation.');
      }
    });
  }

  openRejectModal(ret: StockReturn): void {
    this.selectedReturnDetail.set(ret);
    this.rejectionReasonInput = '';
    this.showRejectModal.set(true);
  }

  confirmReject(): void {
    const ret = this.selectedReturnDetail();
    if (!ret) return;

    this.isSaving.set(true);
    this.stockReturnService.rejectStockReturn(ret.id, { reason: this.rejectionReasonInput }).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        this.showRejectModal.set(false);
        this.selectedReturnDetail.set(updated);
        this.showSuccess(`Déclaration ${updated.reference} REJETÉE.`);
        this.loadReturns();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.showError(err.error?.message || 'Erreur lors du rejet.');
      }
    });
  }

  cancelReturn(ret: StockReturn): void {
    if (!confirm(`Annuler votre déclaration (${ret.reference}) ?`)) return;

    this.isSaving.set(true);
    this.stockReturnService.cancelStockReturn(ret.id).subscribe({
      next: (updated) => {
        this.isSaving.set(false);
        this.selectedReturnDetail.set(updated);
        this.showSuccess(`Déclaration ${updated.reference} ANNULÉE.`);
        this.loadReturns();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.showError(err.error?.message || 'Erreur lors de l\'annulation.');
      }
    });
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  showError(msg: string): void {
    this.errorMessage.set(msg);
    setTimeout(() => this.errorMessage.set(null), 5000);
  }

  showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }
}
