import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { ModalComponent } from '../../shared/ui/components/modal/modal.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { BadgeComponent } from '../../shared/ui/components/badge/badge.component';
import { Currency, Expense, Category } from '../../core/domain/entities';
import { formatCurrency, formatShortDate } from '../../shared/utils';
import { SupabaseExpenseRepository } from '../../core/infrastructure/supabase/adapters/supabase-expense.repository';
import { SupabaseCategoryRepository } from '../../core/infrastructure/supabase/adapters/supabase-category.repository';
import { CreateExpenseUseCase, UpdateExpenseUseCase, DeleteExpenseUseCase, ListExpensesUseCase } from '../../core/application/use-cases/expense/expense.use-cases';

@Component({
  selector: 'app-expenses',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, BadgeComponent],
  templateUrl: './expenses.component.html',
})
export class ExpensesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private expenseRepo = inject(SupabaseExpenseRepository);
  private categoryRepo = inject(SupabaseCategoryRepository);
  private createExpenseUC = inject(CreateExpenseUseCase);
  private updateExpenseUC = inject(UpdateExpenseUseCase);
  private deleteExpenseUC = inject(DeleteExpenseUseCase);
  private listExpensesUC = inject(ListExpensesUseCase);

  form = this.fb.group({
    description: ['', [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ['USD' as Currency],
    categoryId: [''],
    expenseDate: ['', [Validators.required]],
  });

  expenses = signal<Expense[]>([]);
  categories = signal<Category[]>([]);
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isLoading = signal(false);
  editingExpense = signal<Expense | null>(null);
  deletingExpense = signal<Expense | null>(null);
  startDate = signal(this.getDefaultStartDate());
  endDate = signal(this.getDefaultEndDate());
  selectedCategory = signal('');
  page = signal(0);
  pageSize = 20;
  totalAmount = signal(0);

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
    await this.loadExpenses();
  }

  async loadExpenses(): Promise<void> {
    try {
      const filters: { startDate?: Date; endDate?: Date; categoryId?: string } = {
        startDate: new Date(this.startDate()),
        endDate: new Date(this.endDate()),
      };
      if (this.selectedCategory()) {
        filters.categoryId = this.selectedCategory();
      }

      const expenses = await this.expenseRepo.findAll(filters);
      this.expenses.set(expenses);
      this.totalAmount.set(expenses.reduce((sum, e) => sum + e.amount, 0));
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  }

  async loadCategories(): Promise<void> {
    try {
      const categories = await this.categoryRepo.findByType('expense');
      this.categories.set(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  openCreateModal(): void {
    this.editingExpense.set(null);
    this.form.reset({
      currency: 'USD',
      expenseDate: new Date().toISOString().split('T')[0],
    });
    this.isModalOpen.set(true);
  }

  openEditModal(expense: Expense): void {
    this.editingExpense.set(expense);
    this.form.patchValue({
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      categoryId: expense.categoryId ?? '',
      expenseDate: new Date(expense.expenseDate).toISOString().split('T')[0],
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingExpense.set(null);
  }

  confirmDelete(expense: Expense): void {
    this.deletingExpense.set(expense);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingExpense.set(null);
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
        expenseDate: new Date(this.form.value.expenseDate!),
      };

      if (this.editingExpense()) {
        await this.updateExpenseUC.execute(this.editingExpense()!.id, dto);
      } else {
        await this.createExpenseUC.execute(dto, '', false);
      }

      this.closeModal();
      await this.loadExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onDelete(): Promise<void> {
    if (!this.deletingExpense()) return;

    this.isLoading.set(true);
    try {
      await this.deleteExpenseUC.execute(this.deletingExpense()!.id, '');
      this.closeDeleteModal();
      await this.loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  onStartDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.startDate.set(target.value);
    this.loadExpenses();
  }

  onEndDateChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.endDate.set(target.value);
    this.loadExpenses();
  }

  onCategoryFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedCategory.set(target.value);
    this.loadExpenses();
  }

  previousPage(): void {
    this.page.update((p) => Math.max(0, p - 1));
    this.loadExpenses();
  }

  nextPage(): void {
    this.page.update((p) => p + 1);
    this.loadExpenses();
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