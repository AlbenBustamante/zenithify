import { Component, inject, signal, computed, ChangeDetectionStrategy, HostListener, ElementRef } from '@angular/core';
import { DashboardDateRangeService } from '../../../../features/dashboard/services/dashboard-date-range.service';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, isWithinInterval, isBefore, isAfter, addMonths, subMonths, startOfDay } from '../../../utils/date.util';

type ViewMode = 'days' | 'months' | 'years';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isDisabled: boolean;
  isToday: boolean;
  isStart: boolean;
  isEnd: boolean;
  isInRange: boolean;
  isHovered: boolean;
}

interface MonthItem {
  month: number;
  label: string;
  isCurrent: boolean;
}

interface YearItem {
  year: number;
  isCurrent: boolean;
}

@Component({
  selector: 'app-date-range-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './date-range-picker.component.html',
  styleUrl: './date-range-picker.component.css',
})
export class DateRangePickerComponent {
  private dateRange = inject(DashboardDateRangeService);
  private elementRef = inject(ElementRef);

  readonly weekdays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  readonly yearStart = 2020;
  readonly yearEnd = 2030;

  isOpen = signal(false);
  viewMode = signal<ViewMode>('days');
  currentMonth = signal(new Date());
  hoverDate = signal<Date | null>(null);
  tempStart = signal<Date | null>(null);
  tempEnd = signal<Date | null>(null);
  selecting = signal<'start' | 'end'>('start');
  positionRight = signal(false);

  rangeLabel = computed(() => {
    const start = this.dateRange.startDate();
    const end = this.dateRange.endDate();
    return this.formatRangeDisplay(start, end);
  });

  currentMonthName = computed(() => {
    return this.currentMonth().toLocaleDateString('es-VE', { month: 'long' });
  });

  currentYear = computed(() => {
    return this.currentMonth().getFullYear();
  });

  months = computed<MonthItem[]>(() => {
    const currentMonth = this.currentMonth().getMonth();
    const currentYear = new Date().getFullYear();
    const viewingYear = this.currentMonth().getFullYear();

    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    return monthNames.map((label, index) => ({
      month: index,
      label,
      isCurrent: viewingYear === currentYear && index === currentMonth,
    }));
  });

  years = computed<YearItem[]>(() => {
    const currentYear = new Date().getFullYear();
    const years: YearItem[] = [];

    for (let y = this.yearStart; y <= this.yearEnd; y++) {
      years.push({
        year: y,
        isCurrent: y === currentYear,
      });
    }

    return years;
  });

  calendarDays = computed<CalendarDay[]>(() => {
    const month = this.currentMonth();
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const calendarStart = startOfWeek(start);
    const calendarEnd = endOfWeek(end);
    const today = startOfDay(new Date());

    const startDate = this.tempStart() ?? this.dateRange.startDate();
    const endDate = this.tempEnd() ?? this.dateRange.endDate();
    const hover = this.hoverDate();
    const isSelectingEnd = this.selecting() === 'end';

    const days: CalendarDay[] = [];
    let current = new Date(calendarStart);

    while (current <= calendarEnd) {
      const isCurrentMonth = current.getMonth() === month.getMonth();
      const isDisabled = isAfter(current, today);

      let isInRange = false;
      let isHovered = false;

      if (startDate && endDate) {
        if (isSelectingEnd && startDate && hover) {
          isInRange = isWithinInterval(current, { start: startDate, end: hover });
          isHovered = isSameDay(current, hover);
        } else {
          isInRange = isWithinInterval(current, { start: startDate, end: endDate });
        }
      }

      days.push({
        date: new Date(current),
        isCurrentMonth,
        isDisabled,
        isToday: isSameDay(current, today),
        isStart: isSameDay(current, startDate),
        isEnd: isSameDay(current, endDate),
        isInRange,
        isHovered,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closePopup();
    }
  }

  togglePopup(): void {
    if (this.isOpen()) {
      this.closePopup();
    } else {
      this.openPopup();
    }
  }

  openPopup(): void {
    this.tempStart.set(this.dateRange.startDate());
    this.tempEnd.set(this.dateRange.endDate());
    this.currentMonth.set(new Date(this.dateRange.startDate()));
    this.selecting.set('start');
    this.viewMode.set('days');
    this.calculatePosition();
    this.isOpen.set(true);
  }

  private calculatePosition(): void {
    const rect = this.elementRef.nativeElement.getBoundingClientRect();
    const popupWidth = 320;
    const spaceOnRight = window.innerWidth - rect.right;
    this.positionRight.set(spaceOnRight < popupWidth);
  }

  closePopup(): void {
    this.isOpen.set(false);
    this.hoverDate.set(null);
    this.viewMode.set('days');
  }

  navigateBack(): void {
    if (this.viewMode() === 'days') {
      this.currentMonth.update(m => subMonths(m, 1));
    } else if (this.viewMode() === 'months') {
      this.currentMonth.update(m => {
        const newDate = new Date(m);
        newDate.setFullYear(newDate.getFullYear() - 1);
        return newDate;
      });
    } else {
      this.currentMonth.update(m => {
        const newDate = new Date(m);
        newDate.setFullYear(newDate.getFullYear() - 11);
        return newDate;
      });
    }
  }

  navigateForward(): void {
    if (this.viewMode() === 'days') {
      this.currentMonth.update(m => addMonths(m, 1));
    } else if (this.viewMode() === 'months') {
      this.currentMonth.update(m => {
        const newDate = new Date(m);
        newDate.setFullYear(newDate.getFullYear() + 1);
        return newDate;
      });
    } else {
      this.currentMonth.update(m => {
        const newDate = new Date(m);
        newDate.setFullYear(newDate.getFullYear() + 11);
        return newDate;
      });
    }
  }

  selectMonth(month: number): void {
    this.currentMonth.update(m => {
      const newDate = new Date(m);
      newDate.setMonth(month);
      return newDate;
    });
    this.viewMode.set('days');
  }

  selectYear(year: number): void {
    this.currentMonth.update(m => {
      const newDate = new Date(m);
      newDate.setFullYear(year);
      return newDate;
    });
    this.viewMode.set('months');
  }

  goToToday(): void {
    const today = new Date();
    this.currentMonth.set(today);
    this.tempStart.set(startOfMonth(today));
    this.tempEnd.set(today);
    this.selecting.set('end');
    this.viewMode.set('days');
  }

  selectDate(date: Date): void {
    if (this.selecting() === 'start') {
      this.tempStart.set(date);
      this.tempEnd.set(null);
      this.selecting.set('end');
    } else {
      if (this.tempStart() && isBefore(date, this.tempStart()!)) {
        this.tempEnd.set(this.tempStart());
        this.tempStart.set(date);
      } else {
        this.tempEnd.set(date);
      }
      this.selecting.set('start');
    }
    this.hoverDate.set(null);
  }

  onHover(date: Date): void {
    if (this.selecting() === 'end') {
      this.hoverDate.set(date);
    }
  }

  applyRange(): void {
    const start = this.tempStart();
    const end = this.tempEnd();

    if (start && end) {
      const rangeStart = isBefore(start, end) ? start : end;
      const rangeEnd = isAfter(start, end) ? start : end;
      this.dateRange.setDateRange(rangeStart, rangeEnd);
    } else if (start) {
      this.dateRange.setDateRange(start, start);
    }

    this.closePopup();
  }

  private formatRangeDisplay(start: Date, end: Date): string {
    const startOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const endOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };

    const sameYear = start.getFullYear() === end.getFullYear();

    if (sameYear) {
      const startStr = start.toLocaleDateString('es-VE', { day: 'numeric', month: 'long' });
      return `${startStr} — ${end.toLocaleDateString('es-VE', endOpts)}`;
    }

    return `${start.toLocaleDateString('es-VE', startOpts)} — ${end.toLocaleDateString('es-VE', endOpts)}`;
  }
}