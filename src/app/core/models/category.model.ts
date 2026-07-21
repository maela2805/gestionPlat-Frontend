export interface Category {
  id: number;
  name: string;
  description?: string;
  parentCategory?: Category;
  subCategories?: Category[];
  createdAt?: string;
  updatedAt?: string;
}
