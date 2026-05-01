import { Injectable, signal, computed } from '@angular/core';
import { startOfMonth } from '../../../shared/utils/date.util';

@Injectable({ providedIn: 'root' })
export class DashboardDateRangeService {
  private startDateSignal = signal<Date>(startOfMonth());
  private endDateSignal = signal<Date>(new Date());

  readonly startDate = this.startDateSignal.asReadonly();
  readonly endDate = this.endDateSignal.asReadonly();

  readonly label = computed(() => {
    const start = this.startDateSignal();
    const end = this.endDateSignal();
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${start.toLocaleDateString('es-VE', opts)} - ${end.getDate()} ${end.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' })}`;
    }
    return `${start.toLocaleDateString('es-VE', { ...opts, year: 'numeric' })} - ${end.toLocaleDateString('es-VE', { ...opts, year: 'numeric' })}`;
  });

  setDateRange(start: Date, end: Date): void {
    this.startDateSignal.set(start);
    this.endDateSignal.set(end);
  }

  resetToDefault(): void {
    this.startDateSignal.set(startOfMonth());
    this.endDateSignal.set(new Date());
  }
}