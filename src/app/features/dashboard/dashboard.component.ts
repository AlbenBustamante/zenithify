import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { BadgeComponent } from '../../shared/ui/components/badge/badge.component';
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
  imports: [CardComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p class="text-sm text-gray-500 mt-1">{{ today }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <app-card>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Gastos del Mes</p>
              <p class="text-2xl font-bold text-red-600 mt-1">
                {{ formatMoney(totalExpensesThisMonth(), 'USD') }}
              </p>
              @if (vesRate() > 1) {
                <p class="text-sm text-red-400 mt-0.5">
                  {{ formatMoney(totalExpensesThisMonthUSD() * vesRate(), 'VES') }}
                </p>
              }
            </div>
            <div class="p-2 bg-red-100 rounded-lg">
              <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </app-card>

        <app-card>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Ingresos del Mes</p>
              <p class="text-2xl font-bold text-green-600 mt-1">
                {{ formatMoney(totalIncomesThisMonth(), 'USD') }}
              </p>
              @if (vesRate() > 1) {
                <p class="text-sm text-green-400 mt-0.5">
                  {{ formatMoney(totalIncomesThisMonthUSD() * vesRate(), 'VES') }}
                </p>
              }
            </div>
            <div class="p-2 bg-green-100 rounded-lg">
              <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 112 2h-2a2 2 0 012 2v2m-6 9h6a2 2 0 002-2v-6a2 2 0 00-2-2h-6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </app-card>

        <app-card>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Balance Neto</p>
              <p class="text-2xl font-bold mt-1" [class]="netBalance() >= 0 ? 'text-blue-600' : 'text-red-600'">
                {{ formatMoney(netBalance(), 'USD') }}
              </p>
              <p class="text-xs text-gray-400 mt-0.5">Este mes</p>
            </div>
            <div class="p-2 bg-blue-100 rounded-lg">
              <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </app-card>

        <app-card>
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500">Tareas Pendientes</p>
              <p class="text-2xl font-bold text-purple-600 mt-1">
                {{ pendingTasks().length }}
              </p>
              @if (overdueTasks().length > 0) {
                <p class="text-xs text-red-500 mt-0.5">{{ overdueTasks().length }} vencidas</p>
              } @else {
                <p class="text-xs text-gray-400 mt-0.5">Sin vencidas</p>
              }
            </div>
            <div class="p-2 bg-purple-100 rounded-lg">
              <svg class="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
        </app-card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-card title="Renovaciones Próximas" [noPadding]="true">
          @if (upcomingRenewals().length === 0) {
            <div class="p-8 text-center">
              <p class="text-gray-400 text-sm">No hay renovaciones próximas</p>
            </div>
          } @else {
            <div class="divide-y divide-gray-100">
              @for (plan of upcomingRenewals(); track plan.id) {
                <div class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700">
                      {{ plan.name.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{{ plan.name }}</p>
                      <p class="text-xs text-gray-500">{{ plan.provider }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-medium text-gray-900">
                      {{ formatMoney(plan.amount, plan.currency) }}
                    </p>
                    <p class="text-xs" [class]="daysUntil(plan.nextBillingDate) <= 3 ? 'text-red-500' : 'text-gray-500'">
                      {{ daysUntil(plan.nextBillingDate) }} días
                    </p>
                  </div>
                </div>
              }
            </div>
          }
        </app-card>

        <app-card title="Transacciones Recientes" [noPadding]="true">
          @if (recentTransactions().length === 0) {
            <div class="p-8 text-center">
              <p class="text-gray-400 text-sm">No hay transacciones este mes</p>
            </div>
          } @else {
            <div class="divide-y divide-gray-100">
              @for (tx of recentTransactions(); track tx.id) {
                <div class="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                         [class]="tx.type === 'expense' ? 'bg-red-500' : 'bg-green-500'">
                      {{ tx.type === 'expense' ? '-' : '+' }}
                    </div>
                    <div>
                      <p class="font-medium text-gray-900 text-sm">{{ tx.description }}</p>
                      <p class="text-xs text-gray-500">{{ tx.category || 'Sin categoría' }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-medium text-sm" [class]="tx.type === 'expense' ? 'text-red-600' : 'text-green-600'">
                      {{ tx.type === 'expense' ? '-' : '+' }}{{ formatMoney(tx.amount, tx.currency) }}
                    </p>
                    <p class="text-xs text-gray-400">{{ formatDate(tx.date) }}</p>
                  </div>
                </div>
              }
            </div>
          }
        </app-card>
      </div>

      @if (budgetUtilizations().length > 0) {
        <app-card title="Presupuestos">
          <div class="space-y-4">
            @for (budget of budgetUtilizations(); track budget.budgetId) {
              <div>
                <div class="flex justify-between text-sm mb-1.5">
                  <span class="font-medium text-gray-700">{{ budget.budgetName }}</span>
                  <span class="text-gray-500">
                    {{ formatMoney(budget.spent.amount, budget.spent.currency) }} /
                    {{ formatMoney(budget.limit.amount, budget.limit.currency) }}
                  </span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    class="h-1.5 rounded-full transition-all"
                    [class]="budget.isOverBudget ? 'bg-red-500' : 'bg-primary-500'"
                    [style.width.%]="budget.percentage"
                  ></div>
                </div>
              </div>
            }
          </div>
        </app-card>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
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
