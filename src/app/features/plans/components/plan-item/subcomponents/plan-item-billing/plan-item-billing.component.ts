import { Component, input, ChangeDetectionStrategy, computed } from '@angular/core';

@Component({
  selector: 'app-plan-item-billing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-item-billing.component.html',
})
export class PlanItemBillingComponent {
  nextBillingDate = input.required<Date>();

  daysUntil = computed(() => {
    const today = new Date();
    const billing = new Date(this.nextBillingDate());
    const diff = billing.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  });

  formattedDate = computed(() => {
    return new Date(this.nextBillingDate()).toLocaleDateString('es-ES', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  });

  isUrgent = computed(() => this.daysUntil() <= 5);
}