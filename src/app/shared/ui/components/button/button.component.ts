import { Component, input, output } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-button',
  imports: [NgClass],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || loading()"
      [ngClass]="buttonClasses()"
      class="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      (click)="handleClick($event)"
    >
      @if (loading()) {
        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      }
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  variant = input<'primary' | 'secondary' | 'danger' | 'ghost'>('primary');
  size = input<'sm' | 'md' | 'lg'>('md');
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input(false);
  loading = input(false);

  clicked = output<MouseEvent>();

  buttonClasses(): Record<string, boolean> {
    const base: Record<string, boolean> = {
      'px-4 py-2 text-sm': this.size() === 'sm',
      'px-4 py-2.5 text-base': this.size() === 'md',
      'px-6 py-3 text-lg': this.size() === 'lg',
      'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500': this.variant() === 'primary',
      'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500': this.variant() === 'secondary',
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500': this.variant() === 'danger',
      'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500': this.variant() === 'ghost',
    };
    return base;
  }

  handleClick(event: MouseEvent): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }
}