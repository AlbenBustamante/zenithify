import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-badge',
  imports: [NgClass],
  template: `
    <span
      [ngClass]="badgeClasses()"
      class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
    >
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  variant = input<'default' | 'success' | 'warning' | 'danger' | 'info'>('default');
  size = input<'sm' | 'md'>('md');

  badgeClasses(): Record<string, boolean> {
    return {
      'px-2 py-0.5 text-xs': this.size() === 'sm',
      'px-2.5 py-1 text-sm': this.size() === 'md',
      'bg-gray-100 text-gray-800': this.variant() === 'default',
      'bg-green-100 text-green-800': this.variant() === 'success',
      'bg-yellow-100 text-yellow-800': this.variant() === 'warning',
      'bg-red-100 text-red-800': this.variant() === 'danger',
      'bg-blue-100 text-blue-800': this.variant() === 'info',
    };
  }
}