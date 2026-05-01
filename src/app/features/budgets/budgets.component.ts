import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { ModalComponent } from '../../shared/ui/components/modal/modal.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { BadgeComponent } from '../../shared/ui/components/badge/badge.component';
import { SkeletonComponent } from '../../shared/ui/components/skeleton/skeleton.component';
import { Currency, Budget, BudgetPeriod } from '../../core/domain/entities';
import { formatCurrency } from '../../shared/utils';
import { Money } from '../../core/domain/value-objects';
import { SupabaseBudgetRepository } from '../../core/infrastructure/supabase/adapters/supabase-budget.repository';
import { SupabaseExpenseRepository } from '../../core/infrastructure/supabase/adapters/supabase-expense.repository';
import { SupabaseExchangeRateRepository } from '../../core/infrastructure/supabase/adapters/supabase-exchange-rate.repository';
import { BudgetCalculationService } from '../../core/domain/services';
import { CreateBudgetUseCase, UpdateBudgetUseCase, DeleteBudgetUseCase, ListBudgetsUseCase, GetBudgetSummaryUseCase } from '../../core/application/use-cases/budget/budget.use-cases';

interface BudgetWithUtilization extends Budget {
  utilization: {
    spent: Money;
    limit: Money;
    percentage: number;
    isOverBudget: boolean;
  };
}

@Component({
  selector: 'app-budgets',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TitleCasePipe, ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, BadgeComponent, SkeletonComponent],
  templateUrl: './budgets.component.html',
})
export class BudgetsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private budgetRepo = inject(SupabaseBudgetRepository);
  private expenseRepo = inject(SupabaseExpenseRepository);
  private exchangeRateRepo = inject(SupabaseExchangeRateRepository);
  private budgetCalcService = inject(BudgetCalculationService);
  private createBudgetUC = inject(CreateBudgetUseCase);
  private updateBudgetUC = inject(UpdateBudgetUseCase);
  private deleteBudgetUC = inject(DeleteBudgetUseCase);
  private listBudgetsUC = inject(ListBudgetsUseCase);
  private getBudgetSummaryUC = inject(GetBudgetSummaryUseCase);

  Math = Math;

  form = this.fb.group({
    name: ['', [Validators.required]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    currency: ['USD' as Currency],
    period: ['monthly' as BudgetPeriod],
    startDate: ['', [Validators.required]],
  });

  budgets = signal<BudgetWithUtilization[]>([]);
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isLoading = signal(false);
  isDataLoading = signal(true);
  editingBudget = signal<Budget | null>(null);
  deletingBudget = signal<Budget | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadBudgets();
  }

  async loadBudgets(): Promise<void> {
    try {
      const budgets = await this.budgetRepo.findAll();
      const vesRate = await this.getVESRate();

      const budgetsWithUtilization: BudgetWithUtilization[] = [];
      for (const budget of budgets) {
        const expenses = await this.expenseRepo.findByDateRange(
          budget.userId,
          new Date(budget.startDate),
          budget.endDate ?? new Date()
        );
        const utilization = this.budgetCalcService.calculateUtilization(budget, expenses, vesRate);
        budgetsWithUtilization.push({ ...budget, utilization });
      }
      this.budgets.set(budgetsWithUtilization);
    } finally {
      this.isDataLoading.set(false);
    }
  }

  private async getVESRate(): Promise<number> {
    const rate = await this.exchangeRateRepo.findByUserAndPair('', 'VES', 'USD');
    return rate?.rate ?? 1;
  }

  openCreateModal(): void {
    this.editingBudget.set(null);
    this.form.reset({
      currency: 'USD',
      period: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
    });
    this.isModalOpen.set(true);
  }

  openEditModal(budget: Budget): void {
    this.editingBudget.set(budget);
    this.form.patchValue({
      name: budget.name,
      amount: budget.amount,
      currency: budget.currency,
      period: budget.period,
      startDate: new Date(budget.startDate).toISOString().split('T')[0],
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingBudget.set(null);
  }

  confirmDelete(budget: Budget): void {
    this.deletingBudget.set(budget);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingBudget.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    try {
      const dto = {
        name: this.form.value.name!,
        amount: this.form.value.amount!,
        currency: this.form.value.currency as Currency,
        period: this.form.value.period as BudgetPeriod,
        startDate: new Date(this.form.value.startDate!),
      };
      if (this.editingBudget()) {
        await this.updateBudgetUC.execute(this.editingBudget()!.id, dto);
      } else {
        await this.createBudgetUC.execute(dto);
      }
      this.closeModal();
      await this.loadBudgets();
    } catch (error) {
      console.error('Error saving budget:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onDelete(): Promise<void> {
    if (!this.deletingBudget()) return;
    this.isLoading.set(true);
    try {
      await this.deleteBudgetUC.execute(this.deletingBudget()!.id);
      this.closeDeleteModal();
      await this.loadBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  formatMoney(amount: number, currency: Currency): string {
    return formatCurrency(amount, currency);
  }
}