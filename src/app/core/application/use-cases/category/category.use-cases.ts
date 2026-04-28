import { inject, Injectable } from '@angular/core';
import { CATEGORY_PORT } from '../../ports/ports.tokens';
import { CreateCategoryDto, UpdateCategoryDto } from '../../ports/inbound/category-port';
import { Category, CategoryType } from '../../../domain/entities';

@Injectable({ providedIn: 'root' })
export class CreateCategoryUseCase {
  private categoryPort = inject(CATEGORY_PORT);

  async execute(dto: CreateCategoryDto): Promise<Category> {
    return this.categoryPort.create(dto);
  }
}

@Injectable({ providedIn: 'root' })
export class UpdateCategoryUseCase {
  private categoryPort = inject(CATEGORY_PORT);

  async execute(id: string, dto: UpdateCategoryDto): Promise<Category> {
    return this.categoryPort.update(id, dto);
  }
}

@Injectable({ providedIn: 'root' })
export class DeleteCategoryUseCase {
  private categoryPort = inject(CATEGORY_PORT);

  async execute(id: string): Promise<void> {
    return this.categoryPort.delete(id);
  }
}

@Injectable({ providedIn: 'root' })
export class ListCategoriesUseCase {
  private categoryPort = inject(CATEGORY_PORT);

  async execute(): Promise<Category[]> {
    return this.categoryPort.findAll();
  }
}

@Injectable({ providedIn: 'root' })
export class GetCategoriesByTypeUseCase {
  private categoryPort = inject(CATEGORY_PORT);

  async execute(type: CategoryType): Promise<Category[]> {
    return this.categoryPort.findByType(type);
  }
}