import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="badgeClasses">
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  variant = input<'default' | 'success' | 'warning' | 'danger' | 'info'>('default');
  size = input<'sm' | 'md'>('md');

  get badgeClasses(): string {
    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-xs',
    };

    const variantClasses: Record<string, string> = {
      default: 'bg-gray-100 text-gray-700',
      success: 'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      danger: 'bg-red-100 text-red-700',
      info: 'bg-blue-100 text-blue-700',
    };

    const base = 'inline-flex items-center gap-1 rounded-full font-medium';
    const size = sizeClasses[this.size()];
    const variant = variantClasses[this.variant()];

    return [base, size, variant].join(' ');
  }
}
