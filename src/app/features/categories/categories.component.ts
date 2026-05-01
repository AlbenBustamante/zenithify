import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { ModalComponent } from '../../shared/ui/components/modal/modal.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { SkeletonComponent } from '../../shared/ui/components/skeleton/skeleton.component';
import { Category, CategoryType } from '../../core/domain/entities';
import { SupabaseCategoryRepository } from '../../core/infrastructure/supabase/adapters/supabase-category.repository';
import { CreateCategoryUseCase, UpdateCategoryUseCase, DeleteCategoryUseCase, ListCategoriesUseCase } from '../../core/application/use-cases/category/category.use-cases';

@Component({
  selector: 'app-categories',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, SkeletonComponent],
  templateUrl: './categories.component.html',
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
  isDataLoading = signal(true);
  editingCategory = signal<Category | null>(null);
  deletingCategory = signal<Category | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
  }

  async loadCategories(): Promise<void> {
    try {
      const all = await this.categoryRepo.findAll();
      this.expenseCategories.set(all.filter((c) => c.type === 'expense' || c.type === 'both'));
      this.incomeCategories.set(all.filter((c) => c.type === 'income' || c.type === 'both'));
    } finally {
      this.isDataLoading.set(false);
    }
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