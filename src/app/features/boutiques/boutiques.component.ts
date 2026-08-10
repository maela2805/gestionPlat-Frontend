import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BoutiqueService } from '../../core/services/boutique.service';
import { UserService } from '../../core/services/user.service';
import { Boutique, CreateBoutiqueRequest, BoutiquePrice } from '../../core/models/boutique.model';
import { UserSystem } from '../../core/models/user.model';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-boutiques',
  templateUrl: './boutiques.component.html',
  styleUrls: ['./boutiques.component.scss']
})
export class BoutiquesComponent implements OnInit {
  boutiquesList = signal<Boutique[]>([]);
  usersList = signal<UserSystem[]>([]);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  searchTerm = signal<string>('');
  showFormModal = signal<boolean>(false);
  showPriceModal = signal<boolean>(false);

  editingBoutique = signal<Boutique | null>(null);
  selectedBoutiqueForPrices = signal<Boutique | null>(null);
  boutiquePrices = signal<BoutiquePrice[]>([]);

  boutiqueForm: FormGroup;

  isEmployeeLocked = computed(() => {
    const u = this.authService.currentUser();
    return !!(u && u.boutiqueId && (u.roleName === 'ROLE_EMPLOYEE' || u.roleName === 'EMPLOYEE'));
  });

  filteredBoutiques = computed(() => {
    let list = this.boutiquesList();
    const user = this.authService.currentUser();
    const isEmp = user && user.boutiqueId && (user.roleName === 'ROLE_EMPLOYEE' || user.roleName === 'EMPLOYEE');

    if (isEmp) {
      list = list.filter(b => b.id === user.boutiqueId);
    }

    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      list = list.filter(b =>
        b.name.toLowerCase().includes(search) ||
        b.code.toLowerCase().includes(search) ||
        (b.city && b.city.toLowerCase().includes(search)) ||
        (b.managerName && b.managerName.toLowerCase().includes(search)) ||
        (b.employeeUserName && b.employeeUserName.toLowerCase().includes(search))
      );
    }
    return list;
  });

  // --- Pagination ---
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(5);

  paginatedBoutiques = computed(() => {
    const list = this.filteredBoutiques();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    return list.slice(start, start + this.itemsPerPage());
  });

  totalPages = computed(() => Math.ceil(this.filteredBoutiques().length / this.itemsPerPage()) || 1);

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  prevPage(): void {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  totalBoutiques = computed(() => this.filteredBoutiques().length);
  activeBoutiques = computed(() => this.filteredBoutiques().filter(b => b.active).length);

  constructor(
    private boutiqueService: BoutiqueService,
    private userService: UserService,
    public authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.boutiqueForm = this.fb.group({
      code: [''],
      name: ['', Validators.required],
      address: [''],
      city: [''],
      phone: [''],
      managerName: [''],
      employeeUserId: [null],
      active: [true]
    });
  }

  viewBoutiqueArticles(boutique: Boutique, event?: Event): void {
    if (event) event.stopPropagation();
    this.router.navigate(['/warehouses'], { queryParams: { boutiqueId: boutique.id } });
  }

  ngOnInit(): void {
    this.loadBoutiques();
    this.loadUsers();
  }

  loadBoutiques(): void {
    this.isLoading.set(true);
    this.boutiqueService.getAllBoutiques().subscribe({
      next: (data) => {
        this.boutiquesList.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set('Erreur lors du chargement des boutiques.');
        this.isLoading.set(false);
      }
    });
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe(users => {
      this.usersList.set(users);
    });
  }

  updateSearch(e: Event): void {
    this.searchTerm.set((e.target as HTMLInputElement).value);
  }

  openCreateModal(): void {
    this.editingBoutique.set(null);
    this.boutiqueForm.reset({
      code: '',
      name: '',
      address: '',
      city: '',
      phone: '',
      managerName: '',
      employeeUserId: null,
      active: true
    });
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.showFormModal.set(true);
  }

  openEditModal(boutique: Boutique, event?: Event): void {
    if (event) event.stopPropagation();
    this.editingBoutique.set(boutique);
    this.boutiqueForm.patchValue({
      code: boutique.code,
      name: boutique.name,
      address: boutique.address || '',
      city: boutique.city || '',
      phone: boutique.phone || '',
      managerName: boutique.managerName || '',
      employeeUserId: boutique.employeeUserId || null,
      active: boutique.active
    });
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.showFormModal.set(true);
  }

  openPriceModal(boutique: Boutique, event?: Event): void {
    if (event) event.stopPropagation();
    this.selectedBoutiqueForPrices.set(boutique);
    this.loadPricesForBoutique(boutique.id);
    this.showPriceModal.set(true);
  }

  loadPricesForBoutique(boutiqueId: number): void {
    this.boutiqueService.getBoutiquePrices(boutiqueId).subscribe({
      next: (prices) => {
        this.boutiquePrices.set(prices);
      },
      error: () => {
        alert('Erreur lors de la récupération des prix de cession.');
      }
    });
  }

  updateWholesalePrice(item: BoutiquePrice, newPrice: string): void {
    const val = Number(newPrice);
    if (isNaN(val) || val < 0) return;

    this.boutiqueService.setWholesalePrice(item.boutiqueId, {
      productId: item.productId,
      wholesalePrice: val,
      active: item.active
    }).subscribe({
      next: (updated) => {
        item.wholesalePrice = updated.wholesalePrice;
      },
      error: () => {
        alert('Erreur lors de la sauvegarde du prix de cession.');
      }
    });
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  closePriceModal(): void {
    this.showPriceModal.set(false);
  }

  submitForm(): void {
    if (this.boutiqueForm.invalid) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const val = this.boutiqueForm.value;
    const req: CreateBoutiqueRequest = {
      code: val.code || undefined,
      name: val.name,
      address: val.address,
      city: val.city,
      phone: val.phone,
      managerName: val.managerName,
      employeeUserId: val.employeeUserId ? Number(val.employeeUserId) : -1,
      active: val.active
    };

    if (this.editingBoutique()) {
      this.boutiqueService.updateBoutique(this.editingBoutique()!.id, req).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeFormModal();
          this.loadBoutiques();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'Erreur lors de la modification.');
        }
      });
    } else {
      this.boutiqueService.createBoutique(req).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeFormModal();
          this.loadBoutiques();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'Erreur lors de la création.');
        }
      });
    }
  }

  deleteBoutique(boutique: Boutique, event?: Event): void {
    if (event) event.stopPropagation();
    if (confirm(`Voulez-vous vraiment supprimer la boutique "${boutique.name}" ?`)) {
      this.boutiqueService.deleteBoutique(boutique.id).subscribe({
        next: () => this.loadBoutiques(),
        error: () => alert('Impossible de supprimer la boutique.')
      });
    }
  }
}
