import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { ModalComponent } from '../../shared/ui/components/modal/modal.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { BadgeComponent } from '../../shared/ui/components/badge/badge.component';
import { Currency, Income, Category } from '../../core/domain/entities';
import { formatCurrency, formatShortDate } from '../../shared/utils';
import { SupabaseIncomeRepository } from '../../core/infrastructure/supabase/adapters/supabase-income.repository';
import { SupabaseCategoryRepository } from '../../core/infrastructure/supabase/adapters/supabase-category.repository';
import { CreateIncomeUseCase, UpdateIncomeUseCase, DeleteIncomeUseCase } from '../../core/application/use-cases/income/income.use-cases';

@Component({
  selector: 'app-incomes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, BadgeComponent],
  templateUrl: './incomes.component.html',
})
export class IncomesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private incomeRepo = inject(SupabaseIncomeRepository);
  private categoryRepo = inject(SupabaseCategoryRepository);
  private createIncomeUC = inject(CreateIncomeUseCase);
  private updateIncomeUC = inject(UpdateIncomeUseCase);
  private deleteIncomeUC = inject(DeleteIncomeUseCase);

  form = this.fb.group({
    description: ['', [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ['USD' as Currency],
    categoryId: [''],
    incomeDate: ['', [Validators.required]],
  });

  incomes = signal<Income[]>([]);
  categories = signal<Category[]>([]);
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isLoading = signal(false);
  editingIncome = signal<Income | null>(null);
  deletingIncome = signal<Income | null>(null);
  startDate = signal(this.getDefaultStartDate());
  endDate = signal(this.getDefaultEndDate());
  selectedCategory = signal('');
  totalAmount = signal(0);

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
    await this.loadIncomes();
  }

  async loadIncomes(): Promise<void> {
    const filters: { startDate?: Date; endDate?: Date; categoryId?: string } = {
      startDate: new Date(this.startDate()),
      endDate: new Date(this.endDate()),
    };
    if (this.selectedCategory()) filters.categoryId = this.selectedCategory();
    const incomes = await this.incomeRepo.findAll(filters);
    this.incomes.set(incomes);
    this.totalAmount.set(incomes.reduce((sum, i) => sum + i.amount, 0));
  }

  async loadCategories(): Promise<void> {
    const categories = await this.categoryRepo.findByType('income');
    this.categories.set(categories);
  }

  openCreateModal(): void {
    this.editingIncome.set(null);
    this.form.reset({ currency: 'USD', incomeDate: new Date().toISOString().split('T')[0] });
    this.isModalOpen.set(true);
  }

  openEditModal(income: Income): void {
    this.editingIncome.set(income);
    this.form.patchValue({
      description: income.description,
      amount: income.amount,
      currency: income.currency,
      categoryId: income.categoryId ?? '',
      incomeDate: new Date(income.incomeDate).toISOString().split('T')[0],
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingIncome.set(null);
  }

  confirmDelete(income: Income): void {
    this.deletingIncome.set(income);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingIncome.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    try {
      const dto = {
        description: this.form.value.description!,
        amount: this.form.value.amount!,
        currency: this.form.value.currency as Currency,
        categoryId: this.form.value.categoryId || undefined,
        incomeDate: new Date(this.form.value.incomeDate!),
      };
      if (this.editingIncome()) {
        await this.updateIncomeUC.execute(this.editingIncome()!.id, dto);
      } else {
        await this.createIncomeUC.execute(dto, '', false);
      }
      this.closeModal();
      await this.loadIncomes();
    } catch (error) {
      console.error('Error saving income:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onDelete(): Promise<void> {
    if (!this.deletingIncome()) return;
    this.isLoading.set(true);
    try {
      await this.deleteIncomeUC.execute(this.deletingIncome()!.id, '');
      this.closeDeleteModal();
      await this.loadIncomes();
    } catch (error) {
      console.error('Error deleting income:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  onStartDateChange(event: Event): void {
    this.startDate.set((event.target as HTMLInputElement).value);
    this.loadIncomes();
  }

  onEndDateChange(event: Event): void {
    this.endDate.set((event.target as HTMLInputElement).value);
    this.loadIncomes();
  }

  onCategoryFilterChange(event: Event): void {
    this.selectedCategory.set((event.target as HTMLSelectElement).value);
    this.loadIncomes();
  }

  formatMoney(amount: number, currency: Currency): string {
    return formatCurrency(amount, currency);
  }

  formatDate(date: Date): string {
    return formatShortDate(date);
  }

  private getDefaultStartDate(): string {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  }

  private getDefaultEndDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}