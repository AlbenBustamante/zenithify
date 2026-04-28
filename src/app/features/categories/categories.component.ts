import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { ModalComponent } from '../../shared/ui/components/modal/modal.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { Category, CategoryType } from '../../core/domain/entities';
import { SupabaseCategoryRepository } from '../../core/infrastructure/supabase/adapters/supabase-category.repository';
import { CreateCategoryUseCase, UpdateCategoryUseCase, DeleteCategoryUseCase, ListCategoriesUseCase } from '../../core/application/use-cases/category/category.use-cases';

@Component({
  selector: 'app-categories',
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Categorías</h1>
        <app-button (clicked)="openCreateModal()">+ Nueva Categoría</app-button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <app-card title="Categorías de Gastos">
          @if (expenseCategories().length === 0) {
            <p class="text-gray-500 text-center py-4">No hay categorías de gastos</p>
          } @else {
            <div class="space-y-2">
              @for (cat of expenseCategories(); track cat.id) {
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">{{ cat.icon }}</span>
                    <span class="font-medium text-gray-900">{{ cat.name }}</span>
                    @if (cat.isSystem) {
                      <span class="text-xs text-gray-400">(Sistema)</span>
                    }
                  </div>
                  @if (!cat.isSystem) {
                    <div class="flex gap-2">
                      <app-button variant="ghost" size="sm" (clicked)="openEditModal(cat)">Editar</app-button>
                      <app-button variant="ghost" size="sm" (clicked)="confirmDelete(cat)">Eliminar</app-button>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </app-card>

        <app-card title="Categorías de Ingresos">
          @if (incomeCategories().length === 0) {
            <p class="text-gray-500 text-center py-4">No hay categorías de ingresos</p>
          } @else {
            <div class="space-y-2">
              @for (cat of incomeCategories(); track cat.id) {
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div class="flex items-center gap-2">
                    <span class="text-xl">{{ cat.icon }}</span>
                    <span class="font-medium text-gray-900">{{ cat.name }}</span>
                    @if (cat.isSystem) {
                      <span class="text-xs text-gray-400">(Sistema)</span>
                    }
                  </div>
                  @if (!cat.isSystem) {
                    <div class="flex gap-2">
                      <app-button variant="ghost" size="sm" (clicked)="openEditModal(cat)">Editar</app-button>
                      <app-button variant="ghost" size="sm" (clicked)="confirmDelete(cat)">Eliminar</app-button>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </app-card>
      </div>
    </div>

    <app-modal [isOpen]="isModalOpen()" [title]="editingCategory() ? 'Editar Categoría' : 'Nueva Categoría'" (close)="closeModal()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <app-input formControlName="name" label="Nombre" placeholder="Nombre de la categoría"
          [error]="form.controls['name'].invalid && form.controls['name'].touched ? 'Nombre requerido' : ''" />

        <app-select formControlName="type" label="Tipo">
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
          <option value="both">Ambos</option>
        </app-select>

        <app-input formControlName="icon" label="Icono (emoji)" placeholder="🍽️" />
        <app-input formControlName="color" label="Color (hex)" placeholder="#FF6B6B" />

        <div class="flex justify-end gap-3 mt-6">
          <app-button variant="secondary" type="button" (clicked)="closeModal()">Cancelar</app-button>
          <app-button type="submit" [loading]="isLoading()" [disabled]="form.invalid">
            {{ editingCategory() ? 'Actualizar' : 'Guardar' }}
          </app-button>
        </div>
      </form>
    </app-modal>

    <app-modal [isOpen]="isDeleteModalOpen()" title="Eliminar Categoría" (close)="closeDeleteModal()">
      <p class="text-gray-700">¿Estás seguro de que deseas eliminar esta categoría?</p>
      <div class="flex justify-end gap-3 mt-6">
        <app-button variant="secondary" (clicked)="closeDeleteModal()">Cancelar</app-button>
        <app-button variant="danger" (clicked)="onDelete()" [loading]="isLoading()">Eliminar</app-button>
      </div>
    </app-modal>
  `,
})
export class CategoriesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoryRepo = inject(SupabaseCategoryRepository);
  private createCategoryUC = inject(CreateCategoryUseCase);
  private updateCategoryUC = inject(UpdateCategoryUseCase);
  private deleteCategoryUC = inject(DeleteCategoryUseCase);

  form = this.fb.group({
    name: ['', [Validators.required]],
    type: ['expense' as CategoryType],
    icon: [''],
    color: [''],
  });

  expenseCategories = signal<Category[]>([]);
  incomeCategories = signal<Category[]>([]);
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isLoading = signal(false);
  editingCategory = signal<Category | null>(null);
  deletingCategory = signal<Category | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
  }

  async loadCategories(): Promise<void> {
    const all = await this.categoryRepo.findAll();
    this.expenseCategories.set(all.filter((c) => c.type === 'expense' || c.type === 'both'));
    this.incomeCategories.set(all.filter((c) => c.type === 'income' || c.type === 'both'));
  }

  openCreateModal(): void {
    this.editingCategory.set(null);
    this.form.reset({ type: 'expense' });
    this.isModalOpen.set(true);
  }

  openEditModal(category: Category): void {
    this.editingCategory.set(category);
    this.form.patchValue({
      name: category.name,
      type: category.type,
      icon: category.icon ?? '',
      color: category.color ?? '',
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingCategory.set(null);
  }

  confirmDelete(category: Category): void {
    this.deletingCategory.set(category);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingCategory.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    try {
      const dto = {
        name: this.form.value.name!,
        type: this.form.value.type as CategoryType,
        icon: this.form.value.icon || undefined,
        color: this.form.value.color || undefined,
      };
      if (this.editingCategory()) {
        await this.updateCategoryUC.execute(this.editingCategory()!.id, dto);
      } else {
        await this.createCategoryUC.execute(dto);
      }
      this.closeModal();
      await this.loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onDelete(): Promise<void> {
    if (!this.deletingCategory()) return;
    this.isLoading.set(true);
    try {
      await this.deleteCategoryUC.execute(this.deletingCategory()!.id);
      this.closeDeleteModal();
      await this.loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}