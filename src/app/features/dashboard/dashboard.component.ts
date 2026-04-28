import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
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
import { BudgetCalculationService } from '../../core/domain/services';
import { Expense, Income, Plan, Task } from '../../core/domain/entities';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, NgClass, CardComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p class="text-sm text-gray-500">{{ today }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <app-card [title]="'Gastos del Mes'" class="bg-gradient-to-br from-red-50 to-red-100">
          <div class="text-2xl font-bold text-red-600">
            {{ formatMoney(totalExpensesThisMonth(), 'USD') }}
          </div>
          <p class="text-sm text-gray-500 mt-1">En USD</p>
          @if (vesRate() > 1) {
            <div class="text-lg font-semibold text-red-400 mt-1">
              {{ formatMoney(totalExpensesThisMonthUSD() * vesRate(), 'VES') }}
            </div>
          }
        </app-card>

        <app-card [title]="'Ingresos del Mes'" class="bg-gradient-to-br from-green-50 to-green-100">
          <div class="text-2xl font-bold text-green-600">
            {{ formatMoney(totalIncomesThisMonth(), 'USD') }}
          </div>
          <p class="text-sm text-gray-500 mt-1">En USD</p>
          @if (vesRate() > 1) {
            <div class="text-lg font-semibold text-green-400 mt-1">
              {{ formatMoney(totalIncomesThisMonthUSD() * vesRate(), 'VES') }}
            </div>
          }
        </app-card>

        <app-card [title]="'Balance Neto'" class="bg-gradient-to-br from-blue-50 to-blue-100">
          <div class="text-2xl font-bold" [ngClass]="netBalance() >= 0 ? 'text-blue-600' : 'text-red-600'">
            {{ formatMoney(netBalance(), 'USD') }}
          </div>
          <p class="text-sm text-gray-500 mt-1">Este mes</p>
        </app-card>

        <app-card [title]="'Tareas Pendientes'" class="bg-gradient-to-br from-purple-50 to-purple-100">
          <div class="text-2xl font-bold text-purple-600">
            {{ pendingTasks().length }}
          </div>
          <p class="text-sm text-gray-500 mt-1">
            @if (overdueTasks().length > 0) {
              <span class="text-red-500">{{ overdueTasks().length }} vencidas</span>
            } @else {
              Ninguna vencida
            }
          </p>
        </app-card>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <app-card title="Renovaciones Próximas" [noPadding]="true">
          @if (upcomingRenewals().length === 0) {
            <div class="p-6 text-center text-gray-500">
              No hay renovaciones próximas
            </div>
          } @else {
            <div class="divide-y divide-gray-200">
              @for (plan of upcomingRenewals(); track plan.id) {
                <div class="p-4 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      {{ plan.name.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{{ plan.name }}</p>
                      <p class="text-sm text-gray-500">{{ plan.provider }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-medium text-gray-900">
                      {{ formatMoney(plan.amount, plan.currency) }}
                    </p>
                    <p class="text-sm" [ngClass]="daysUntil(plan.nextBillingDate) <= 3 ? 'text-red-500' : 'text-gray-500'">
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
            <div class="p-6 text-center text-gray-500">
              No hay transacciones este mes
            </div>
          } @else {
            <div class="divide-y divide-gray-200">
              @for (tx of recentTransactions(); track tx.id) {
                <div class="p-4 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                         [ngClass]="tx.type === 'expense' ? 'bg-red-500' : 'bg-green-500'">
                      {{ tx.type === 'expense' ? '-' : '+' }}
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{{ tx.description }}</p>
                      <p class="text-sm text-gray-500">{{ tx.category || 'Sin categoría' }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="font-medium" [ngClass]="tx.type === 'expense' ? 'text-red-600' : 'text-green-600'">
                      {{ tx.type === 'expense' ? '-' : '+' }}{{ formatMoney(tx.amount, tx.currency) }}
                    </p>
                    <p class="text-sm text-gray-500">{{ formatDate(tx.date) }}</p>
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
                <div class="flex justify-between text-sm mb-1">
                  <span class="font-medium text-gray-700">{{ budget.budgetName }}</span>
                  <span class="text-gray-500">
                    {{ formatMoney(budget.spent.amount, budget.spent.currency) }} /
                    {{ formatMoney(budget.limit.amount, budget.limit.currency) }}
                  </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div
                    class="h-2 rounded-full transition-all"
                    [ngClass]="budget.isOverBudget ? 'bg-red-500' : 'bg-primary-500'"
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

    try {
      const expenses = await this.expenseRepo.findByDateRange('', startOfMonth, endOfMonth);
      const incomes = await this.incomeRepo.findByDateRange('', startOfMonth, endOfMonth);

      this.totalExpensesThisMonth.set(expenses.reduce((sum, e) => sum + e.amount, 0));
      this.totalIncomesThisMonth.set(incomes.reduce((sum, i) => sum + i.amount, 0));

      const vesRateData = await this.exchangeRateRepo.findByUserAndPair('', 'VES', 'USD');
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
          '',
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