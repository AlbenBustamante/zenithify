import { Component, signal, inject, OnInit, ChangeDetectionStrategy, effect } from '@angular/core';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { StatCardComponent } from '../../shared/ui/components/stat-card/stat-card.component';
import { DateRangePickerComponent } from '../../shared/ui/components/date-range-picker/date-range-picker.component';
import { ExpensesIncomesChartComponent } from '../../shared/ui/components/expenses-incomes-chart/expenses-incomes-chart.component';
import { SkeletonComponent } from '../../shared/ui/components/skeleton/skeleton.component';
import { Currency, Expense, Income } from '../../core/domain/entities';
import { Money } from '../../core/domain/value-objects';
import { formatCurrency } from '../../shared/utils';
import { SupabaseExpenseRepository } from '../../core/infrastructure/supabase/adapters/supabase-expense.repository';
import { SupabaseIncomeRepository } from '../../core/infrastructure/supabase/adapters/supabase-income.repository';
import { SupabasePlanRepository } from '../../core/infrastructure/supabase/adapters/supabase-plan.repository';
import { SupabaseTaskRepository } from '../../core/infrastructure/supabase/adapters/supabase-task.repository';
import { SupabaseBudgetRepository } from '../../core/infrastructure/supabase/adapters/supabase-budget.repository';
import { SupabaseExchangeRateRepository } from '../../core/infrastructure/supabase/adapters/supabase-exchange-rate.repository';
import { SupabaseAuthAdapter } from '../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { BudgetCalculationService } from '../../core/domain/services';
import { DashboardDateRangeService } from './services/dashboard-date-range.service';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, StatCardComponent, DateRangePickerComponent, ExpensesIncomesChartComponent, SkeletonComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  protected Math = Math;

  private expenseRepo = inject(SupabaseExpenseRepository);
  private incomeRepo = inject(SupabaseIncomeRepository);
  private planRepo = inject(SupabasePlanRepository);
  private taskRepo = inject(SupabaseTaskRepository);
  private budgetRepo = inject(SupabaseBudgetRepository);
  private exchangeRateRepo = inject(SupabaseExchangeRateRepository);
  private budgetCalcService = inject(BudgetCalculationService);
  private authAdapter = inject(SupabaseAuthAdapter);
  readonly dateRange = inject(DashboardDateRangeService);

  private statsLoaded = signal(false);
  isLoading = signal(true);

  today = new Date().toLocaleDateString('es-VE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  totalExpensesThisMonth = signal(0);
  totalIncomesThisMonth = signal(0);
  totalExpensesThisMonthUSD = signal(0);
  totalIncomesThisMonthUSD = signal(0);
  netBalance = signal(0);
  vesRate = signal(1);

  pendingTasks = signal<any[]>([]);
  overdueTasks = signal<any[]>([]);
  upcomingRenewals = signal<any[]>([]);
  recentTransactions = signal<Array<{
    id: string;
    type: 'expense' | 'income';
    description: string;
    amount: number;
    currency: Currency;
    category?: string;
    date: Date;
  }>>([]);
  budgetUtilizations = signal<Array<{
    budgetId: string;
    budgetName: string;
    spent: Money;
    limit: Money;
    percentage: number;
    isOverBudget: boolean;
  }>>([]);

  constructor() {
    effect(() => {
      const start = this.dateRange.startDate();
      const end = this.dateRange.endDate();
      if (this.statsLoaded()) {
        this.loadStatsData(start, end);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadNonFilteredData();
    this.statsLoaded.set(true);
  }

  private async loadNonFilteredData(): Promise<void> {
    try {
      this.pendingTasks.set(await this.taskRepo.findPending());
      this.overdueTasks.set(await this.taskRepo.findOverdue());
      this.upcomingRenewals.set(await this.planRepo.findUpcomingRenewals(14));

      const budgets = await this.budgetRepo.findActive();
      const utilizations = [];
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      for (const budget of budgets) {
        const budgetExpenses = await this.expenseRepo.findByDateRange(
          budget.userId,
          new Date(budget.startDate),
          budget.endDate ?? endOfMonth
        );
        const vesRateData = await this.exchangeRateRepo.findByUserAndPair(budget.userId, 'VES', 'USD');
        const rate = vesRateData?.rate ?? 1;
        utilizations.push(this.budgetCalcService.calculateUtilization(budget, budgetExpenses, rate));
      }
      this.budgetUtilizations.set(utilizations);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadStatsData(start: Date, end: Date): Promise<void> {
    const currentUser = await this.authAdapter.getCurrentUser();
    if (!currentUser) return;
    const userId = currentUser.id;

    try {
      const [expenses, incomes] = await Promise.all([
        this.expenseRepo.findByDateRange(userId, start, end),
        this.incomeRepo.findByDateRange(userId, start, end),
      ]);

      this.totalExpensesThisMonth.set(expenses.reduce((sum, e) => sum + this.getMainAmount(e), 0));
      this.totalIncomesThisMonth.set(incomes.reduce((sum, i) => sum + this.getMainAmount(i), 0));

      const vesRateData = await this.exchangeRateRepo.findByUserAndPair(userId, 'VES', 'USD');
      this.vesRate.set(vesRateData?.rate ?? 1);

      this.totalExpensesThisMonthUSD.set(expenses.reduce((sum, e) => sum + this.getAmountInUSD(e), 0));
      this.totalIncomesThisMonthUSD.set(incomes.reduce((sum, i) => sum + this.getAmountInUSD(i), 0));

      this.netBalance.set(this.totalIncomesThisMonthUSD() - this.totalExpensesThisMonthUSD());
    } catch (error) {
      console.error('Error loading stats data:', error);
    }
  }

  private getAmountInUSD(item: Expense | Income): number {
    if (item.amountUsd) return item.amountUsd;
    if (item.amountVes) return item.amountVes / item.exchangeRate;
    return 0;
  }

  private getMainAmount(item: Expense | Income): number {
    return item.amountUsd ?? item.amountVes ?? 0;
  }

  formatMoney(amount: number, currency: Currency): string {
    return formatCurrency(amount, currency);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('es-VE', { month: 'short', day: 'numeric' });
  }

  daysUntil(date: Date): number {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}