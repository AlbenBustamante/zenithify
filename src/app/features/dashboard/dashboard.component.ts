import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CardComponent } from '../../shared/ui/components/card/card.component';
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
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-stone-100 px-4 py-8">
      <div class="max-w-7xl mx-auto space-y-8">

        <header class="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 animate-slide-up">
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <span class="w-1 h-8 bg-primary-600 rounded-full"></span>
              <h1 class="text-4xl font-bold text-slate-900 tracking-tight">
                Dashboard
              </h1>
            </div>
            <p class="text-slate-500 text-sm tracking-wide">{{ today }}</p>
          </div>
          <div class="flex items-center gap-2 text-xs  text-slate-400 uppercase tracking-widest">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live</span>
          </div>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          <div class="animate-slide-up stagger-1">
            <app-card>
              <div class="relative overflow-hidden">
                <div class="absolute -top-4 -right-4 w-24 h-24 bg-red-100 rounded-full blur-xl opacity-60"></div>
                <div class="relative">
                  <div class="flex items-start justify-between mb-4">
                    <span class="text-xs  font-bold text-red-600 uppercase tracking-wider">Gastos del Mes</span>
                    <div class="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
                      <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p class="text-3xl font-bold  text-slate-900 mb-1">
                    {{ formatMoney(totalExpensesThisMonth(), 'USD') }}
                  </p>
                  @if (vesRate() > 1) {
                    <p class="text-sm  text-red-400/80">
                      {{ formatMoney(totalExpensesThisMonthUSD() * vesRate(), 'VES') }}
                    </p>
                  }
                </div>
              </div>
            </app-card>
          </div>

          <div class="animate-slide-up stagger-2">
            <app-card>
              <div class="relative overflow-hidden">
                <div class="absolute -top-4 -right-4 w-24 h-24 bg-emerald-100 rounded-full blur-xl opacity-60"></div>
                <div class="relative">
                  <div class="flex items-start justify-between mb-4">
                    <span class="text-xs  font-bold text-emerald-600 uppercase tracking-wider">Ingresos del Mes</span>
                    <div class="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <svg class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                  </div>
                  <p class="text-3xl font-bold  text-slate-900 mb-1">
                    {{ formatMoney(totalIncomesThisMonth(), 'USD') }}
                  </p>
                  @if (vesRate() > 1) {
                    <p class="text-sm  text-emerald-400/80">
                      {{ formatMoney(totalIncomesThisMonthUSD() * vesRate(), 'VES') }}
                    </p>
                  }
                </div>
              </div>
            </app-card>
          </div>

          <div class="animate-slide-up stagger-3">
            <app-card>
              <div class="relative overflow-hidden">
                <div class="absolute -top-4 -right-4 w-24 h-24 bg-blue-100 rounded-full blur-xl opacity-60"></div>
                <div class="relative">
                  <div class="flex items-start justify-between mb-4">
                    <span class="text-xs  font-bold text-blue-600 uppercase tracking-wider">Balance Neto</span>
                    <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <p class="text-3xl font-bold  mb-1" [class]="netBalance() >= 0 ? 'text-slate-900' : 'text-red-600'">
                    {{ formatMoney(netBalance(), 'USD') }}
                  </p>
                  <div class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full" [class]="netBalance() >= 0 ? 'bg-emerald-500' : 'bg-red-500'"></span>
                    <span class="text-xs  text-slate-400">Este mes</span>
                  </div>
                </div>
              </div>
            </app-card>
          </div>

          <div class="animate-slide-up stagger-4">
            <app-card>
              <div class="relative overflow-hidden">
                <div class="absolute -top-4 -right-4 w-24 h-24 bg-violet-100 rounded-full blur-xl opacity-60"></div>
                <div class="relative">
                  <div class="flex items-start justify-between mb-4">
                    <span class="text-xs  font-bold text-violet-600 uppercase tracking-wider">Tareas</span>
                    <div class="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center">
                      <svg class="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                  </div>
                  <p class="text-3xl font-bold  text-slate-900 mb-1">
                    {{ pendingTasks().length }}
                  </p>
                  @if (overdueTasks().length > 0) {
                    <div class="flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      <span class="text-xs  text-red-500">{{ overdueTasks().length }} vencidas</span>
                    </div>
                  } @else {
                    <span class="text-xs  text-slate-400">Sin vencidas</span>
                  }
                </div>
              </div>
            </app-card>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-slide-up stagger-5">
          <app-card title="Renovaciones Próximas" [noPadding]="true" class="lg:col-span-2">
            @if (upcomingRenewals().length === 0) {
              <div class="p-12 text-center">
                <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p class="text-sm  text-slate-400">Sin renovaciones próximas</p>
              </div>
            } @else {
              <div class="divide-y divide-slate-100">
                @for (plan of upcomingRenewals(); track plan.id) {
                  <div class="p-5 flex items-center justify-between hover:bg-slate-50/80 transition-all duration-200 group">
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-lg font-bold  text-primary-700 group-hover:scale-105 transition-transform">
                        {{ plan.name.charAt(0).toUpperCase() }}
                      </div>
                      <div>
                        <p class="font-semibold text-slate-800">{{ plan.name }}</p>
                        <p class="text-xs  text-slate-400 mt-0.5">{{ plan.provider }}</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class=" font-bold text-slate-800">
                        {{ formatMoney(plan.amount, plan.currency) }}
                      </p>
                      <p class="text-xs  mt-0.5" [class]="daysUntil(plan.nextBillingDate) <= 3 ? 'text-red-500' : 'text-slate-400'">
                        {{ daysUntil(plan.nextBillingDate) }} días
                      </p>
                    </div>
                  </div>
                }
              </div>
            }
          </app-card>

          <app-card title="Transacciones Recientes" [noPadding]="true" class="lg:col-span-3">
            @if (recentTransactions().length === 0) {
              <div class="p-12 text-center">
                <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p class="text-sm  text-slate-400">Sin transacciones este mes</p>
              </div>
            } @else {
              <div class="divide-y divide-slate-100">
                @for (tx of recentTransactions(); track tx.id) {
                  <div class="p-5 flex items-center justify-between hover:bg-slate-50/80 transition-all duration-200 group">
                    <div class="flex items-center gap-4">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold  text-white"
                           [class]="tx.type === 'expense' ? 'bg-gradient-to-br from-red-400 to-red-600' : 'bg-gradient-to-br from-emerald-400 to-emerald-600'">
                        {{ tx.type === 'expense' ? '−' : '+' }}
                      </div>
                      <div>
                        <p class="font-medium text-slate-800 text-sm">{{ tx.description }}</p>
                        <p class="text-xs  text-slate-400 mt-0.5">{{ tx.category || 'Sin categoría' }}</p>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class=" font-bold text-sm" [class]="tx.type === 'expense' ? 'text-red-600' : 'text-emerald-600'">
                        {{ tx.type === 'expense' ? '−' : '+' }}{{ formatMoney(tx.amount, tx.currency) }}
                      </p>
                      <p class="text-xs  text-slate-400 mt-0.5">{{ formatDate(tx.date) }}</p>
                    </div>
                  </div>
                }
              </div>
            }
          </app-card>
        </div>

        @if (budgetUtilizations().length > 0) {
          <app-card title="Presupuestos" class="animate-slide-up stagger-6">
            <div class="space-y-6">
              @for (budget of budgetUtilizations(); track budget.budgetId) {
                <div class="relative">
                  <div class="flex justify-between items-end mb-2">
                    <div>
                      <span class="text-sm font-semibold text-slate-700">{{ budget.budgetName }}</span>
                    </div>
                    <div class="text-right">
                      <span class=" text-sm font-bold" [class]="budget.isOverBudget ? 'text-red-600' : 'text-slate-600'">
                        {{ formatMoney(budget.spent.amount, budget.spent.currency) }}
                      </span>
                      <span class="text-slate-300 mx-1">/</span>
                      <span class=" text-sm text-slate-400">
                        {{ formatMoney(budget.limit.amount, budget.limit.currency) }}
                      </span>
                    </div>
                  </div>
                  <div class="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      class="absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out"
                      [class]="budget.isOverBudget ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-primary-400 to-primary-600'"
                      [style.width.%]="Math.min(budget.percentage, 100)"
                    ></div>
                    @if (budget.isOverBudget) {
                      <div class="absolute top-0 right-0 h-full bg-red-800/20 animate-pulse rounded-full"
                           [style.width.%]="Math.min(budget.percentage - 100, 100)"></div>
                    }
                  </div>
                  <div class="flex justify-between mt-1.5">
                    <span class="text-xs " [class]="budget.isOverBudget ? 'text-red-500' : 'text-slate-400'">
                      {{ budget.percentage.toFixed(0) }}% utilizado
                    </span>
                    @if (budget.isOverBudget) {
                      <span class="text-xs  text-red-500">Excedido</span>
                    }
                  </div>
                </div>
              }
            </div>
          </app-card>
        }
      </div>
    </div>
  `,
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