import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { DashboardDateRangeService } from '../../../../features/dashboard/services/dashboard-date-range.service';
import { toISOStringDate, parseDate } from '../../../utils/date.util';

@Component({
  selector: 'app-date-range-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2">
        <label class="text-xs text-slate-500 uppercase tracking-wider font-medium">Desde</label>
        <input
          type="date"
          class="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          [value]="toISOStringDate(dateRange.startDate())"
          (change)="onStartChange($event)"
        />
      </div>
      <span class="text-slate-300 text-lg">—</span>
      <div class="flex items-center gap-2">
        <label class="text-xs text-slate-500 uppercase tracking-wider font-medium">Hasta</label>
        <input
          type="date"
          class="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          [value]="toISOStringDate(dateRange.endDate())"
          (change)="onEndChange($event)"
        />
      </div>
      <button
        type="button"
        class="ml-2 px-3 py-2 text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
        (click)="onReset()"
      >
        Hoy
      </button>
    </div>
  `,
})
export class DateRangePickerComponent {
  readonly dateRange = inject(DashboardDateRangeService);
  readonly toISOStringDate = toISOStringDate;

  onStartChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.dateRange.setDateRange(parseDate(input.value), this.dateRange.endDate());
  }

  onEndChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.dateRange.setDateRange(this.dateRange.startDate(), parseDate(input.value));
  }

  onReset(): void {
    this.dateRange.resetToDefault();
  }
}