import {
  Component,
  inject,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
  OnDestroy,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { DashboardDateRangeService } from '../../../../features/dashboard/services/dashboard-date-range.service';
import { SupabaseExpenseRepository } from '../../../../core/infrastructure/supabase/adapters/supabase-expense.repository';
import { SupabaseIncomeRepository } from '../../../../core/infrastructure/supabase/adapters/supabase-income.repository';
import { SupabaseAuthAdapter } from '../../../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { Expense, Income } from '../../../../core/domain/entities';
import { toISOStringDate } from '../../../../shared/utils/date.util';

Chart.register(...registerables);

interface DailyData {
  date: string;
  income: number;
  expense: number;
}

@Component({
  selector: 'app-expenses-incomes-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasData()) {
      <div class="relative" [style.height.px]="400">
        <canvas #chartCanvas></canvas>
      </div>
      <div class="hidden">{{ triggerRender() }}</div>
    } @else {
      <div class="h-96 flex items-center justify-center">
        <div class="text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <p class="text-sm text-slate-400">Sin datos en este rango de fechas</p>
        </div>
      </div>
    }
  `,
})
export class ExpensesIncomesChartComponent implements OnDestroy {
  readonly dateRange = inject(DashboardDateRangeService);
  private expenseRepo = inject(SupabaseExpenseRepository);
  private incomeRepo = inject(SupabaseIncomeRepository);
  private authAdapter = inject(SupabaseAuthAdapter);

  private chart: Chart | null = null;
  private loaded = signal(false);

  private dailyData = signal<DailyData[]>([]);

  readonly hasData = computed(() =>
    this.dailyData().some((d) => d.income > 0 || d.expense > 0)
  );

  triggerRender = () => {
    this.renderChart(this.dailyData());
    return '';
  };

  constructor() {
    effect(() => {
      const start = this.dateRange.startDate();
      const end = this.dateRange.endDate();
      if (this.loaded()) {
        this.loadData(start, end);
      }
    });
  }

  ngAfterViewInit(): void {
    this.loaded.set(true);
    this.loadData(this.dateRange.startDate(), this.dateRange.endDate());
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private async loadData(start: Date, end: Date): Promise<void> {
    const user = await this.authAdapter.getCurrentUser();
    if (!user) return;

    const [expenses, incomes] = await Promise.all([
      this.expenseRepo.findByDateRange(user.id, start, end),
      this.incomeRepo.findByDateRange(user.id, start, end),
    ]);

    const aggregated = this.aggregateByDate(expenses, incomes, start, end);
    this.dailyData.set(aggregated);
    this.renderChart(aggregated);
  }

  private aggregateByDate(
    expenses: Expense[],
    incomes: Income[],
    start: Date,
    end: Date
  ): DailyData[] {
    const map = new Map<string, { income: number; expense: number }>();

    const current = new Date(start);
    const endTime = end.getTime();
    while (current.getTime() <= endTime) {
      const key = this.dateKey(current);
      map.set(key, { income: 0, expense: 0 });
      current.setDate(current.getDate() + 1);
    }

    for (const e of expenses) {
      const key = this.dateKey(e.expenseDate);
      const current = map.get(key);
      if (current) {
        const amount = e.amountUsd ?? (e.amountVes ?? 0) / (e.exchangeRate || 1);
        current.expense += amount;
      }
    }

    for (const i of incomes) {
      const key = this.dateKey(i.incomeDate);
      const current = map.get(key);
      if (current) {
        const amount = i.amountUsd ?? (i.amountVes ?? 0) / (i.exchangeRate || 1);
        current.income += amount;
      }
    }

    return Array.from(map.entries()).map(([date, values]) => ({
      date,
      ...values,
    }));
  }

  private dateKey(date: Date): string {
    return toISOStringDate(date);
  }

  private renderChart(data: DailyData[]): void {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const labels = data.map((d) => {
      const date = new Date(d.date);
      return date.toLocaleDateString('es-VE', { month: 'short', day: 'numeric' });
    });

    const incomeData = data.map((d) => d.income);
    const expenseData = data.map((d) => d.expense);

    const maxValue = Math.max(0, ...incomeData, ...expenseData);

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ingresos',
            data: incomeData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Gastos',
            data: expenseData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { family: 'Inter', size: 12 },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#1e293b',
            bodyColor: '#475569',
            borderColor: '#e2e8f0',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: (ctx) => {
                const value = ctx.raw as number;
                return ` ${ctx.dataset.label}: $${value.toFixed(2)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' },
          },
          y: {
            beginAtZero: true,
            max: maxValue * 1.1,
            grid: { color: '#f1f5f9' },
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#64748b',
              callback: (value) => `$${value}`,
            },
          },
        },
      },
    });
  }
}