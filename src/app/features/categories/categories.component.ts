import { Component, OnInit, signal } from '@angular/core';
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

  categoryForm: FormGroup;
  isSaving = signal<boolean>(false);

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

  saveCategory(): void {
    if (this.categoryForm.invalid) return;

    this.isSaving.set(true);
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
        this.loadData();
      },
      error: () => this.isSaving.set(false)
    });
  }
}
