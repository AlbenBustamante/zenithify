import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { StatCardComponent } from '../../shared/ui/components/stat-card/stat-card.component';
import { Currency } from '../../core/domain/entities';
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
import { Expense, Income, Plan, Task } from '../../core/domain/entities';

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, StatCardComponent],
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

  pendingTasks = signal<Task[]>([]);
  overdueTasks = signal<Task[]>([]);
  upcomingRenewals = signal<Plan[]>([]);
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

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
  }

  private async loadDashboardData(): Promise<void> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const currentUser = await this.authAdapter.getCurrentUser();
    if (!currentUser) {
      console.error('No user logged in');
      return;
    }
    const userId = currentUser.id;

    try {
      const expenses = await this.expenseRepo.findByDateRange(userId, startOfMonth, endOfMonth);
      const incomes = await this.incomeRepo.findByDateRange(userId, startOfMonth, endOfMonth);

      this.totalExpensesThisMonth.set(expenses.reduce((sum, e) => sum + e.amount, 0));
      this.totalIncomesThisMonth.set(incomes.reduce((sum, i) => sum + i.amount, 0));

      const vesRateData = await this.exchangeRateRepo.findByUserAndPair(userId, 'VES', 'USD');
      this.vesRate.set(vesRateData?.rate ?? 1);

      this.totalExpensesThisMonthUSD.set(
        expenses.reduce((sum, e) => {
          if (e.currency === 'USD') return sum + e.amount;
          return sum + e.amount / this.vesRate();
        }, 0)
      );

      this.totalIncomesThisMonthUSD.set(
        incomes.reduce((sum, i) => {
          if (i.currency === 'USD') return sum + i.amount;
          return sum + i.amount / this.vesRate();
        }, 0)
      );

      this.netBalance.set(this.totalIncomesThisMonthUSD() - this.totalExpensesThisMonthUSD());

      this.pendingTasks.set(await this.taskRepo.findPending());
      this.overdueTasks.set(await this.taskRepo.findOverdue());
      this.upcomingRenewals.set(await this.planRepo.findUpcomingRenewals(14));

      const txList: Array<{
        id: string;
        type: 'expense' | 'income';
        description: string;
        amount: number;
        currency: Currency;
        category?: string;
        date: Date;
      }> = [];

      expenses.slice(0, 5).forEach((e) => {
        txList.push({
          id: e.id,
          type: 'expense',
          description: e.description,
          amount: e.amount,
          currency: e.currency,
          date: e.expenseDate,
        });
      });

      incomes.slice(0, 5).forEach((i) => {
        txList.push({
          id: i.id,
          type: 'income',
          description: i.description,
          amount: i.amount,
          currency: i.currency,
          date: i.incomeDate,
        });
      });

      txList.sort((a, b) => b.date.getTime() - a.date.getTime());
      this.recentTransactions.set(txList.slice(0, 5));

      const budgets = await this.budgetRepo.findActive();
      const utilizations = [];
      for (const budget of budgets) {
        const budgetExpenses = await this.expenseRepo.findByDateRange(
          userId,
          new Date(budget.startDate),
          budget.endDate ?? endOfMonth
        );
        utilizations.push(
          this.budgetCalcService.calculateUtilization(budget, budgetExpenses, this.vesRate())
        );
      }
      this.budgetUtilizations.set(utilizations);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
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