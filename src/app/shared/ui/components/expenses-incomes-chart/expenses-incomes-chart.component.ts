import {
  Component,
  inject,
  signal,
  effect,
  ChangeDetectionStrategy,
  OnDestroy,
  input,
} from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { DashboardDateRangeService } from '../../../../features/dashboard/services/dashboard-date-range.service';
import { SupabaseExpenseRepository } from '../../../../core/infrastructure/supabase/adapters/supabase-expense.repository';
import { SupabaseIncomeRepository } from '../../../../core/infrastructure/supabase/adapters/supabase-income.repository';
import { SupabaseAuthAdapter } from '../../../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { Expense, Income, Currency } from '../../../../core/domain/entities';

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
    <div class="relative" [style.height.px]="400">
      <canvas #chartCanvas></canvas>
    </div>
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

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = this.dateKey(d);
      map.set(key, { income: 0, expense: 0 });
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
    return date.toISOString().split('T')[0];
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