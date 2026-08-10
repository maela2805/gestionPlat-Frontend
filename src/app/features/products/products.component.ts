import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { AuthService } from '../../core/services/auth.service';
import { Product, ProductRequest } from '../../core/models/product.model';
import { Category } from '../../core/models/category.model';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {
  products = signal<Product[]>([]);
  categories = signal<Category[]>([]);

  searchTerm = signal<string>('');
  selectedCategoryId = signal<number | null>(null);
  filterAlertOnly = signal<boolean>(false);
  viewMode = signal<'grid' | 'table'>('table');

  // Pagination Signals
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(5);

  showModal = signal<boolean>(false);
  editingProduct = signal<Product | null>(null);
  isSaving = signal<boolean>(false);
  formError = signal<string | null>(null);

  productForm: FormGroup;

  filteredProducts = computed(() => {
    let list = this.products();

    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.reference.toLowerCase().includes(search)
      );
    }

    const catId = this.selectedCategoryId();
    if (catId) {
      list = list.filter(p => p.category?.id === Number(catId));
    }

    if (this.filterAlertOnly()) {
      list = list.filter(p => p.stock <= p.alertThreshold);
    }

    return list;
  });

  totalPages = computed(() => Math.ceil(this.filteredProducts().length / this.itemsPerPage()) || 1);

  paginatedProducts = computed(() => {
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    return this.filteredProducts().slice(start, start + perPage);
  });

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    public authService: AuthService,
    private fb: FormBuilder
  ) {
    this.productForm = this.fb.group({
      reference: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      buyPrice: [0, [Validators.required, Validators.min(0)]],
      wholesalePrice: [0, [Validators.required, Validators.min(0)]],
      boutiquePrice: [0, [Validators.required, Validators.min(0)]],
      sellPrice: [null],
      initialStock: [0],
      alertThreshold: [5],
      barcode: [''],
      imageUrl: [''],
      categoryId: [null]
    });
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  loadProducts(): void {
    this.productService.getAllProducts().subscribe(prods => this.products.set(prods));
  }

  loadCategories(): void {
    this.categoryService.getAllCategories().subscribe(cats => this.categories.set(cats));
  }

  updateSearch(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.currentPage.set(1);
  }

  updateCategoryFilter(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId.set(val ? Number(val) : null);
    this.currentPage.set(1);
  }

  updateAlertFilterSelect(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.filterAlertOnly.set(val === 'alert');
    this.currentPage.set(1);
  }

  // Permission Checks : La boutique ne peut pas ajouter/modifier un produit
  canCreateProduct(): boolean {
    const user = this.authService.currentUser();
    if (user?.boutiqueId) return false;
    return this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
  }

  canEditProduct(): boolean {
    const user = this.authService.currentUser();
    if (user?.boutiqueId) return false;
    return this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
  }

  canDeleteProduct(): boolean {
    const user = this.authService.currentUser();
    if (user?.boutiqueId) return false;
    return this.authService.hasAnyRole(['SUPER_ADMIN', 'ADMIN']);
  }

  // Pagination Controls
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

  onImageUploaded(url: string | null): void {
    this.productForm.patchValue({ imageUrl: url || '' });
  }

  openCreateModal(): void {
    this.editingProduct.set(null);
    const count = this.products().length + 1;
    const autoRef = 'PROD-' + count.toString().padStart(5, '0');
    this.productForm.reset({
      reference: autoRef,
      buyPrice: 0,
      wholesalePrice: 0,
      boutiquePrice: 0,
      sellPrice: 0,
      initialStock: 0,
      alertThreshold: 5,
      imageUrl: '',
      categoryId: null
    });
    this.formError.set(null);
    this.showModal.set(true);
  }

  openEditModal(p: Product): void {
    this.editingProduct.set(p);
    this.productForm.patchValue({
      reference: p.reference,
      name: p.name,
      description: p.description || '',
      buyPrice: p.buyPrice,
      wholesalePrice: p.wholesalePrice || p.sellPrice || p.buyPrice,
      boutiquePrice: p.boutiquePrice || p.sellPrice || p.buyPrice,
      sellPrice: p.sellPrice,
      alertThreshold: p.alertThreshold,
      barcode: p.barcode || '',
      imageUrl: p.imageUrl || '',
      categoryId: p.category?.id || null
    });
    this.formError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveProduct(): void {
    if (this.productForm.invalid) return;

    this.isSaving.set(true);
    this.formError.set(null);

    const formVal = this.productForm.value;
    const req: ProductRequest = {
      reference: formVal.reference,
      name: formVal.name,
      description: formVal.description,
      buyPrice: Number(formVal.buyPrice),
      wholesalePrice: Number(formVal.wholesalePrice),
      boutiquePrice: Number(formVal.boutiquePrice),
      sellPrice: Number(formVal.boutiquePrice),
      initialStock: formVal.initialStock ? Number(formVal.initialStock) : 0,
      alertThreshold: Number(formVal.alertThreshold),
      barcode: formVal.barcode,
      imageUrl: formVal.imageUrl,
      categoryId: formVal.categoryId ? Number(formVal.categoryId) : undefined
    };

    const edit = this.editingProduct();

    if (edit) {
      this.productService.updateProduct(edit.id, req).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadProducts();
          this.loadCategories();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.formError.set(err.message || 'Erreur lors de la modification');
        }
      });
    } else {
      this.productService.createProduct(req).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.closeModal();
          this.loadProducts();
          this.loadCategories();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.formError.set(err.message || 'Erreur lors de la création');
        }
      });
    }
  }

  deleteProduct(p: Product): void {
    if (confirm(`Voulez-vous vraiment supprimer "${p.name}" ?`)) {
      this.productService.deleteProduct(p.id).subscribe({
        next: () => { this.loadProducts(); this.loadCategories(); },
        error: (err) => alert(err.message || 'Impossible de supprimer ce produit')
      });
    }
  }
}
