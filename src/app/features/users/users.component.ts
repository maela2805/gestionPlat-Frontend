import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { UserSystem, SystemRole, UserCreateRequest, UserUpdateRequest } from '../../core/models/user.model';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users = signal<UserSystem[]>([]);
  roles = signal<SystemRole[]>([]);

  searchTerm = signal<string>('');
  selectedRoleFilter = signal<string>('');
  showModal = signal<boolean>(false);
  editingUser = signal<UserSystem | null>(null);

  // Pagination Signals
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(4);

  userForm: FormGroup;
  isSaving = signal<boolean>(false);
  formError = signal<string | null>(null);

  filteredUsers = computed(() => {
    let list = this.users();
    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      list = list.filter(u => 
        u.email.toLowerCase().includes(search) || 
        (u.firstName && u.firstName.toLowerCase().includes(search)) ||
        (u.lastName && u.lastName.toLowerCase().includes(search))
      );
    }
    const role = this.selectedRoleFilter();
    if (role) {
      list = list.filter(u => u.roleName === role);
    }
    return list;
  });

  totalPages = computed(() => Math.ceil(this.filteredUsers().length / this.itemsPerPage()) || 1);

  paginatedUsers = computed(() => {
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    return this.filteredUsers().slice(start, start + perPage);
  });

  constructor(
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: [''],
      firstName: [''],
      lastName: [''],
      roleName: ['ROLE_EMPLOYEE', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  loadUsers(): void {
    this.userService.getAllUsers().subscribe(u => this.users.set(u));
  }

  loadRoles(): void {
    this.userService.getAllRoles().subscribe(r => this.roles.set(r));
  }

  updateSearch(e: Event): void {
    this.searchTerm.set((e.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  updateRoleFilter(e: Event): void {
    this.selectedRoleFilter.set((e.target as HTMLSelectElement).value);
    this.currentPage.set(1);
  }

  // Pagination Methods
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

  updateItemsPerPage(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.itemsPerPage.set(val);
    this.currentPage.set(1);
  }

  openCreateModal(): void {
    this.editingUser.set(null);
    this.userForm.reset({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      roleName: 'ROLE_EMPLOYEE'
    });
    this.userForm.get('email')?.enable();
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.formError.set(null);
    this.showModal.set(true);
  }

  openEditModal(u: UserSystem): void {
    this.editingUser.set(u);
    this.userForm.patchValue({
      email: u.email,
      password: '',
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      roleName: u.roleName || 'ROLE_EMPLOYEE'
    });
    this.userForm.get('email')?.disable();
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.formError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  getInitials(u: UserSystem): string {
    if (u.firstName && u.lastName) {
      return (u.firstName[0] + u.lastName[0]).toUpperCase();
    }
    return u.email.substring(0, 2).toUpperCase();
  }

  saveUser(): void {
    if (this.userForm.invalid) return;

    this.isSaving.set(true);
    this.formError.set(null);

    const formVal = this.userForm.getRawValue();
    const edit = this.editingUser();

    if (edit) {
      const updateReq: UserUpdateRequest = {
        firstName: formVal.firstName,
        lastName: formVal.lastName,
        roleName: formVal.roleName,
        password: formVal.password ? formVal.password : undefined
      };

      this.userService.updateUser(edit.id, updateReq).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadUsers();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.formError.set(err.message || err.error?.message || 'Erreur lors de la modification');
        }
      });
    } else {
      const createReq: UserCreateRequest = {
        email: formVal.email,
        password: formVal.password,
        firstName: formVal.firstName,
        lastName: formVal.lastName,
        roleName: formVal.roleName
      };

      this.userService.createUser(createReq).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadUsers();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.formError.set(err.message || err.error?.message || 'Erreur lors de la création');
        }
      });
    }
  }

  toggleStatus(u: UserSystem): void {
    this.userService.toggleUserStatus(u.id).subscribe({
      next: () => this.loadUsers(),
      error: (err) => alert(err.message || 'Impossible de modifier le statut')
    });
  }

  deleteUser(u: UserSystem): void {
    if (confirm(`Voulez-vous vraiment supprimer le compte "${u.email}" ?`)) {
      this.userService.deleteUser(u.id).subscribe({
        next: () => this.loadUsers(),
        error: (err) => alert(err.message || 'Impossible de supprimer cet utilisateur')
      });
    }
  }
}
