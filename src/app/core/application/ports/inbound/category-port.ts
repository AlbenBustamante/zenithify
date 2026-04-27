import { Category, CategoryType } from '../../domain/entities';

export interface CreateCategoryDto {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  icon?: string;
  color?: string;
}

export interface CategoryPort {
  create(category: CreateCategoryDto): Promise<Category>;
  update(id: string, category: UpdateCategoryDto): Promise<Category>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Category | null>;
  findAll(): Promise<Category[]>;
  findByType(type: CategoryType): Promise<Category[]>;
  findSystem(): Promise<Category[]>;
  findUserCreated(): Promise<Category[]>;
}