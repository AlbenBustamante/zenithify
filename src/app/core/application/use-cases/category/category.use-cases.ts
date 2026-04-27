import { inject, Injectable } from '@angular/core';
import { CategoryPort, CreateCategoryDto, UpdateCategoryDto } from '../../ports/inbound/category-port';
import { Category, CategoryType } from '../../../domain/entities';

@Injectable()
export class CreateCategoryUseCase {
  private categoryPort = inject(CategoryPort);

  async execute(dto: CreateCategoryDto): Promise<Category> {
    return this.categoryPort.create(dto);
  }
}

@Injectable()
export class UpdateCategoryUseCase {
  private categoryPort = inject(CategoryPort);

  async execute(id: string, dto: UpdateCategoryDto): Promise<Category> {
    return this.categoryPort.update(id, dto);
  }
}

@Injectable()
export class DeleteCategoryUseCase {
  private categoryPort = inject(CategoryPort);

  async execute(id: string): Promise<void> {
    return this.categoryPort.delete(id);
  }
}

@Injectable()
export class ListCategoriesUseCase {
  private categoryPort = inject(CategoryPort);

  async execute(): Promise<Category[]> {
    return this.categoryPort.findAll();
  }
}

@Injectable()
export class GetCategoriesByTypeUseCase {
  private categoryPort = inject(CategoryPort);

  async execute(type: CategoryType): Promise<Category[]> {
    return this.categoryPort.findByType(type);
  }
}