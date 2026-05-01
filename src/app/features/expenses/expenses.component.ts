import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { ModalComponent } from '../../shared/ui/components/modal/modal.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { BadgeComponent } from '../../shared/ui/components/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/components/skeleton/skeleton.component';
import { Expense, Category, PaymentMethod } from '../../core/domain/entities';
import { formatCurrency, formatShortDate } from '../../shared/utils';
import { SupabaseExpenseRepository } from '../../core/infrastructure/supabase/adapters/supabase-expense.repository';
import { SupabaseCategoryRepository } from '../../core/infrastructure/supabase/adapters/supabase-category.repository';
import { SupabaseAuthAdapter } from '../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { CreateExpenseUseCase, UpdateExpenseUseCase, DeleteExpenseUseCase, ListExpensesUseCase } from '../../core/application/use-cases/expense/expense.use-cases';
import { CurrencyConversionService } from '../../core/domain/services/currency-conversion.service';
import { environment } from '../../../environments/environment';

function atLeastOneAmountValidator(control: AbstractControl): ValidationErrors | null {
  const amountUsd = control.get('amountUsd')?.value;
  const amountVes = control.get('amountVes')?.value;
  if (!amountUsd && !amountVes) {
    return { required: true };
  }
  return null;
}

@Component({
  selector: 'app-expenses',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, BadgeComponent, DecimalPipe, SkeletonComponent],
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
  private currencyService = inject(CurrencyConversionService);
  private authAdapter = inject(SupabaseAuthAdapter);

  paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'divisas', label: 'Divisas' },
    { value: 'transferencia', label: 'Transferencia' },
  ];

  form = this.fb.group(
    {
      description: ['', [Validators.required]],
      amountUsd: [null as number | null],
      amountVes: [null as number | null],
      exchangeRate: [null as number | null, [Validators.required, Validators.min(0.01)]],
      categoryId: [''],
      expenseDate: ['', [Validators.required]],
      paymentMethod: ['cash' as PaymentMethod],
    },
    { validators: atLeastOneAmountValidator }
  );

  expenses = signal<Expense[]>([]);
  categories = signal<Category[]>([]);
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isRateDialogOpen = signal(false);
  isLoading = signal(false);
  isDataLoading = signal(true);
  editingExpense = signal<Expense | null>(null);
  deletingExpense = signal<Expense | null>(null);
  startDate = signal(this.getDefaultStartDate());
  endDate = signal(this.getDefaultEndDate());
  selectedCategory = signal('');
  page = signal(0);
  pageSize = 20;
  totalAmount = signal(0);

  officialRate = signal<number | null>(null);
  activeAmountField = signal<'usd' | 'ves' | null>(null);
  pendingRateValue = signal<number | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
    await this.loadExpenses();
    await this.fetchOfficialRate();
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
      this.totalAmount.set(
        expenses.reduce((sum, e) => {
          const usd = e.amountUsd ?? 0;
          const ves = e.amountVes ?? 0;
          return sum + (usd > 0 ? usd : ves / e.exchangeRate);
        }, 0)
      );
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      this.isDataLoading.set(false);
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

  async fetchOfficialRate(): Promise<void> {
    try {
      const rate = await this.currencyService.fetchOfficialVESRate(environment.dolarApiUrl);
      this.officialRate.set(rate);
    } catch (error) {
      console.error('Error fetching official rate:', error);
    }
  }

  refreshRate(): void {
    this.currencyService.clearCache();
    this.fetchOfficialRate();
  }

  openCreateModal(): void {
    this.editingExpense.set(null);
    const rate = this.officialRate() ?? 500;
    this.form.reset({
      amountUsd: null,
      amountVes: null,
      exchangeRate: rate,
      expenseDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      categoryId: '',
      description: '',
    });
    this.activeAmountField.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(expense: Expense): void {
    this.editingExpense.set(expense);
    const rate = expense.exchangeRate;
    this.form.patchValue({
      description: expense.description,
      amountUsd: expense.amountUsd ?? null,
      amountVes: expense.amountVes ?? null,
      exchangeRate: rate,
      categoryId: expense.categoryId ?? '',
      expenseDate: new Date(expense.expenseDate).toISOString().split('T')[0],
      paymentMethod: expense.paymentMethod,
    });
    const hasUsd = expense.amountUsd != null;
    const hasVes = expense.amountVes != null;
    this.activeAmountField.set(hasUsd ? 'usd' : hasVes ? 'ves' : null);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingExpense.set(null);
    this.isRateDialogOpen.set(false);
  }

  confirmDelete(expense: Expense): void {
    this.deletingExpense.set(expense);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingExpense.set(null);
  }

  onAmountUsdChange(): void {
    this.activeAmountField.set('usd');
    const usd = this.form.value.amountUsd;
    const rate = this.form.value.exchangeRate;
    if (usd && rate && rate > 0) {
      this.form.patchValue({ amountVes: usd * rate }, { emitEvent: false });
    }
  }

  onAmountVesChange(): void {
    this.activeAmountField.set('ves');
    const ves = this.form.value.amountVes;
    const rate = this.form.value.exchangeRate;
    if (ves && rate && rate > 0) {
      this.form.patchValue({ amountUsd: ves / rate }, { emitEvent: false });
    }
  }

  onExchangeRateChange(): void {
    const currentUsd = this.form.value.amountUsd;
    const currentVes = this.form.value.amountVes;
    const newRate = this.form.value.exchangeRate;

    if (!newRate || newRate <= 0) return;

    if (currentUsd && currentVes) {
      this.pendingRateValue.set(newRate);
      this.isRateDialogOpen.set(true);
    } else if (this.activeAmountField() === 'usd' && currentUsd) {
      this.form.patchValue({ amountVes: currentUsd * newRate }, { emitEvent: false });
    } else if (this.activeAmountField() === 'ves' && currentVes) {
      this.form.patchValue({ amountUsd: currentVes / newRate }, { emitEvent: false });
    }
  }

  keepVesOnRateChange(): void {
    const newRate = this.pendingRateValue();
    const currentVes = this.form.value.amountVes;
    if (newRate && currentVes) {
      this.form.patchValue({ exchangeRate: newRate, amountUsd: currentVes / newRate }, { emitEvent: false });
    }
    this.isRateDialogOpen.set(false);
  }

  keepUsdOnRateChange(): void {
    const newRate = this.pendingRateValue();
    const currentUsd = this.form.value.amountUsd;
    if (newRate && currentUsd) {
      this.form.patchValue({ exchangeRate: newRate, amountVes: currentUsd * newRate }, { emitEvent: false });
    }
    this.isRateDialogOpen.set(false);
  }

  cancelRateChange(): void {
    this.form.patchValue({ exchangeRate: this.officialRate() ?? 500 }, { emitEvent: false });
    this.isRateDialogOpen.set(false);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    try {
      const currentUser = await this.authAdapter.getCurrentUser();
      if (!currentUser) {
        console.error('No user logged in');
        return;
      }
      const dto = {
        description: this.form.value.description!,
        amountUsd: this.form.value.amountUsd ?? undefined,
        amountVes: this.form.value.amountVes ?? undefined,
        exchangeRate: this.form.value.exchangeRate!,
        categoryId: this.form.value.categoryId || undefined,
        expenseDate: new Date(this.form.value.expenseDate!),
        paymentMethod: this.form.value.paymentMethod!,
      };

      if (this.editingExpense()) {
        await this.updateExpenseUC.execute(this.editingExpense()!.id, dto);
      } else {
        await this.createExpenseUC.execute(dto, currentUser.id, false);
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
      const currentUser = await this.authAdapter.getCurrentUser();
      if (!currentUser) {
        console.error('No user logged in');
        return;
      }
      await this.deleteExpenseUC.execute(this.deletingExpense()!.id, currentUser.id);
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
    const target = event.target as HTMLSelectElement;
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

  formatMoney(amount: number, currency: 'USD' | 'VES'): string {
    return formatCurrency(amount, currency);
  }

  formatDate(date: Date): string {
    return formatShortDate(date);
  }

  getAmountInUSD(expense: Expense): number {
    if (expense.amountUsd) return expense.amountUsd;
    if (expense.amountVes) return expense.amountVes / expense.exchangeRate;
    return 0;
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