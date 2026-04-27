import { Category, CategoryType } from '../../domain/entities';
import { CreateCategoryDto, UpdateCategoryDto } from '../inbound/category-port';

export interface CategoryRepositoryPort {
  create(category: CreateCategoryDto): Promise<Category>;
  update(id: string, category: UpdateCategoryDto): Promise<Category>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Category | null>;
  findAll(): Promise<Category[]>;
  findByType(type: CategoryType): Promise<Category[]>;
  findSystem(): Promise<Category[]>;
  findUserCreated(): Promise<Category[]>;
}