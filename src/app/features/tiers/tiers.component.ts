import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TiersService } from '../../core/services/tiers.service';
import { Tiers, TiersType, TiersStatus, CreateTiersRequest, UpdateTiersRequest } from '../../core/models/tiers.model';

@Component({
  selector: 'app-tiers',
  templateUrl: './tiers.component.html',
  styleUrls: ['./tiers.component.scss']
})
export class TiersComponent implements OnInit {
  tiersList = signal<Tiers[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Filters
  searchTerm = signal<string>('');
  activeTypeFilter = signal<string>(''); // '' = Tous, 'FOURNISSEUR', 'CLIENT', 'PARTENAIRE'
  statusFilter = signal<string>(''); // '' = Tous, 'ACTIF', 'INACTIF'

  // Modals
  showFormModal = signal<boolean>(false);
  showDetailModal = signal<boolean>(false);
  editingTiers = signal<Tiers | null>(null);
  selectedTiersDetail = signal<Tiers | null>(null);

  // Form
  tiersForm: FormGroup;

  // Pagination Signals
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(6);

  // Stats
  totalCount = computed(() => this.tiersList().length);
  fournisseursCount = computed(() => this.tiersList().filter(t => t.type === 'FOURNISSEUR').length);
  clientsCount = computed(() => this.tiersList().filter(t => t.type === 'CLIENT').length);
  partenairesCount = computed(() => this.tiersList().filter(t => t.type === 'PARTENAIRE').length);

  // Filtered List
  filteredTiers = computed(() => {
    let list = this.tiersList();

    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      list = list.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.code.toLowerCase().includes(search) ||
        (t.email && t.email.toLowerCase().includes(search)) ||
        (t.phone && t.phone.toLowerCase().includes(search)) ||
        (t.city && t.city.toLowerCase().includes(search))
      );
    }

    const type = this.activeTypeFilter();
    if (type) {
      list = list.filter(t => t.type === type);
    }

    const status = this.statusFilter();
    if (status) {
      list = list.filter(t => t.status === status);
    }

    return list;
  });

  totalPages = computed(() => Math.ceil(this.filteredTiers().length / this.itemsPerPage()) || 1);

  paginatedTiers = computed(() => {
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    return this.filteredTiers().slice(start, start + perPage);
  });

  constructor(
    private tiersService: TiersService,
    private fb: FormBuilder
  ) {
    this.tiersForm = this.fb.group({
      code: [''],
      name: ['', Validators.required],
      type: ['FOURNISSEUR', Validators.required],
      email: ['', [Validators.email]],
      phone: [''],
      address: [''],
      city: [''],
      taxId: [''],
      status: ['ACTIF', Validators.required],
      note: ['']
    });
  }

  ngOnInit(): void {
    this.loadTiers();
  }

  loadTiers(): void {
    this.isLoading.set(true);
    this.tiersService.getAllTiers().subscribe({
      next: (data) => {
        this.tiersList.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Erreur lors du chargement des tiers.');
        this.isLoading.set(false);
      }
    });
  }

  updateSearch(e: Event): void {
    this.searchTerm.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  setTypeFilter(type: string): void {
    this.activeTypeFilter.set(type);
    this.currentPage.set(1);
  }

  updateTypeFilter(e: Event): void {
    this.activeTypeFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  updateStatusFilter(e: Event): void {
    this.statusFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  openCreateModal(): void {
    this.editingTiers.set(null);
    this.tiersForm.reset({
      code: '',
      name: '',
      type: 'FOURNISSEUR',
      email: '',
      phone: '',
      address: '',
      city: '',
      taxId: '',
      status: 'ACTIF',
      note: ''
    });
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.showFormModal.set(true);
  }

  openEditModal(tiers: Tiers, event?: Event): void {
    if (event) event.stopPropagation();
    this.editingTiers.set(tiers);
    this.tiersForm.patchValue({
      code: tiers.code,
      name: tiers.name,
      type: tiers.type,
      email: tiers.email || '',
      phone: tiers.phone || '',
      address: tiers.address || '',
      city: tiers.city || '',
      taxId: tiers.taxId || '',
      status: tiers.status,
      note: tiers.note || ''
    });
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.showFormModal.set(true);
  }

  openDetailModal(tiers: Tiers): void {
    this.selectedTiersDetail.set(tiers);
    this.showDetailModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
  }

  submitForm(): void {
    if (this.tiersForm.invalid) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const val = this.tiersForm.value;

    if (this.editingTiers()) {
      const updateReq: UpdateTiersRequest = {
        name: val.name,
        type: val.type as TiersType,
        email: val.email,
        phone: val.phone,
        address: val.address,
        city: val.city,
        taxId: val.taxId,
        status: val.status as TiersStatus,
        note: val.note
      };

      this.tiersService.updateTiers(this.editingTiers()!.id, updateReq).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('Tiers mis à jour avec succès !');
          this.closeFormModal();
          this.loadTiers();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'Erreur lors de la modification.');
        }
      });
    } else {
      const createReq: CreateTiersRequest = {
        code: val.code || undefined,
        name: val.name,
        type: val.type as TiersType,
        email: val.email,
        phone: val.phone,
        address: val.address,
        city: val.city,
        taxId: val.taxId,
        status: val.status as TiersStatus,
        note: val.note
      };

      this.tiersService.createTiers(createReq).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.successMessage.set('Nouveau tiers créé avec succès !');
          this.closeFormModal();
          this.loadTiers();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'Erreur lors de la création.');
        }
      });
    }
  }

  deleteTiers(tiers: Tiers, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm(`Êtes-vous sûr de vouloir supprimer le tiers "${tiers.name}" (${tiers.code}) ?`)) {
      this.tiersService.deleteTiers(tiers.id).subscribe({
        next: () => {
          this.loadTiers();
        },
        error: (err) => {
          alert('Impossible de supprimer ce tiers.');
        }
      });
    }
  }

  // Pagination
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
}
