import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { ToastType } from '../../../services/toast.service';

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toast.component.html',
  host: {
    'aria-live': 'polite',
    'aria-atomic': 'true',
  },
})
export class ToastComponent {
  message = input('');
  type = input<ToastType>('info');
  visible = input(false);
  dismiss = output<void>();

  containerClasses = computed(() => {
    const base = 'flex items-start gap-3 w-full max-w-sm p-4 rounded-lg shadow-lg border pointer-events-auto transition-all duration-300 ease-in-out';
    const visibility = this.visible()
      ? 'translate-y-0 opacity-100'
      : '-translate-y-2 opacity-0 pointer-events-none';
    const variant = this.variantClasses();
    return [base, visibility, variant].join(' ');
  });

  icon = computed(() => {
    switch (this.type()) {
      case 'success':
        return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />';
      case 'error':
        return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />';
      case 'warning':
        return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />';
      default:
        return '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />';
    }
  });

  iconColor = computed(() => {
    switch (this.type()) {
      case 'success':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-amber-500';
      default:
        return 'text-primary-500';
    }
  });

  messageClasses = computed(() => {
    const base = 'text-sm font-medium';
    switch (this.type()) {
      case 'success':
        return `${base} text-green-800`;
      case 'error':
        return `${base} text-red-800`;
      case 'warning':
        return `${base} text-amber-800`;
      default:
        return `${base} text-primary-800`;
    }
  });

  closeButtonClasses = computed(() => {
    const base = 'shrink-0 p-1 rounded-md transition-colors';
    switch (this.type()) {
      case 'success':
        return `${base} text-green-500 hover:text-green-700 hover:bg-green-100`;
      case 'error':
        return `${base} text-red-500 hover:text-red-700 hover:bg-red-100`;
      case 'warning':
        return `${base} text-amber-500 hover:text-amber-700 hover:bg-amber-100`;
      default:
        return `${base} text-primary-500 hover:text-primary-700 hover:bg-primary-100`;
    }
  });

  private variantClasses = computed(() => {
    switch (this.type()) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-primary-50 border-primary-200';
    }
  });

  onDismiss(): void {
    this.dismiss.emit();
  }
}
