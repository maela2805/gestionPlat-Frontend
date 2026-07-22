export interface Category {
  id: number;
  name: string;
  description?: string;
  parent?: Category;
  parentCategory?: Category;
  children?: Category[];
  subCategories?: Category[];
  productCount?: number;
  createdAt?: string;
  updatedAt?: string;
}
