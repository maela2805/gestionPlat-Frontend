import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models/category.model';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss']
})
export class CategoriesComponent implements OnInit {
  categories = signal<Category[]>([]);
  rootCategories = signal<Category[]>([]);

  searchTerm = signal<string>('');
  parentFilterId = signal<number | null>(null);
  showModal = signal<boolean>(false);

  categoryForm: FormGroup;
  isSaving = signal<boolean>(false);

  filteredCategories = computed(() => {
    let list = this.categories();

    const search = this.searchTerm().toLowerCase().trim();
    if (search) {
      list = list.filter(c => 
        c.name.toLowerCase().includes(search) || 
        (c.description && c.description.toLowerCase().includes(search))
      );
    }

    const parentId = this.parentFilterId();
    if (parentId !== null) {
      if (parentId === 0) {
        // Root only
        list = list.filter(c => !c.parentCategory);
      } else {
        list = list.filter(c => c.parentCategory && c.parentCategory.id === parentId);
      }
    }

    return list;
  });

  constructor(
    private categoryService: CategoryService,
    private fb: FormBuilder
  ) {
    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      parentCategoryId: [null]
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.categoryService.getAllCategories().subscribe(cats => this.categories.set(cats));
    this.categoryService.getRootCategories().subscribe(roots => this.rootCategories.set(roots));
  }

  updateSearch(e: Event): void {
    this.searchTerm.set((e.target as HTMLInputElement).value);
  }

  updateParentFilter(e: Event): void {
    const val = (e.target as HTMLSelectElement).value;
    this.parentFilterId.set(val !== '' ? Number(val) : null);
  }

  formError = signal<string | null>(null);

  openCreateModal(): void {
    this.categoryForm.reset({ parentCategoryId: null });
    this.formError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveCategory(): void {
    if (this.categoryForm.invalid) return;

    this.isSaving.set(true);
    this.formError.set(null);
    const formVal = this.categoryForm.value;

    const payload: Partial<Category> = {
      name: formVal.name,
      description: formVal.description,
      parentCategory: formVal.parentCategoryId ? { id: Number(formVal.parentCategoryId) } as Category : undefined
    };

    this.categoryService.createCategory(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.categoryForm.reset({ parentCategoryId: null });
        this.closeModal();
        this.loadData();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.formError.set(err.message || err.error?.message || 'Erreur lors de la création de la catégorie');
      }
    });
  }

  deleteCategory(c: Category): void {
    if (confirm(`Voulez-vous vraiment supprimer la catégorie "${c.name}" ?`)) {
      this.categoryService.deleteCategory(c.id).subscribe({
        next: () => this.loadData(),
        error: (err) => alert(err.message || 'Impossible de supprimer cette catégorie')
      });
    }
  }
}
