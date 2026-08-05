import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

@Injectable({ providedIn: 'root' })
export class ToastService {
  message = signal('');
  type = signal<ToastType>('info');
  visible = signal(false);

  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  show(message: string, type: ToastType = 'info', duration = 5000): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.message.set(message);
    this.type.set(type);
    this.visible.set(true);

    if (duration > 0) {
      this.timeoutId = setTimeout(() => {
        this.dismiss();
      }, duration);
    }
  }

  dismiss(): void {
    this.visible.set(false);
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
