import { Component, input, output } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-modal',
  imports: [NgClass],
  template: `
    @if (isOpen()) {
      <div
        class="fixed inset-0 z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div
            class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            (click)="onBackdropClick()"
          ></div>

          <div class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8"
               [ngClass]="sizeClasses()">
            <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div class="flex justify-between items-start mb-4">
                <h3 class="text-lg font-semibold text-gray-900">{{ title() }}</h3>
                <button
                  type="button"
                  class="text-gray-400 hover:text-gray-600"
                  (click)="close.emit()"
                >
                  <span class="sr-only">Close</span>
                  <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <ng-content />
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  isOpen = input(false);
  title = input('');
  size = input<'sm' | 'md' | 'lg' | 'xl'>('md');

  close = output<void>();

  sizeClasses(): Record<string, boolean> {
    return {
      'sm:max-w-md': this.size() === 'sm',
      'sm:max-w-lg': this.size() === 'md',
      'sm:max-w-2xl': this.size() === 'lg',
      'sm:max-w-4xl': this.size() === 'xl',
    };
  }

  onBackdropClick(): void {
    this.close.emit();
  }
}