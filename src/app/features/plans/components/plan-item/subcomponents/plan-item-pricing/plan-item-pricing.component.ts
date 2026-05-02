import { Component, input, ChangeDetectionStrategy, computed } from '@angular/core';
import { Currency } from '../../../../../../core/domain/entities';

@Component({
  selector: 'app-plan-item-pricing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-item-pricing.component.html',
})
export class PlanItemPricingComponent {
  amount = input.required<number>();
  currency = input.required<Currency>();
  billingCycle = input.required<'monthly' | 'yearly'>();

  formattedAmount = computed(() => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency(),
    }).format(this.amount());
  });

  cycleLabel = computed(() =>
    this.billingCycle() === 'monthly' ? 'mes' : 'año'
  );
}