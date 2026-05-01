import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';
import { BadgeComponent } from '../../../../shared/ui/components/badge/badge.component';
import { SkeletonComponent } from '../../../../shared/ui/components/skeleton/skeleton.component';
import { Plan, Currency } from '../../../../core/domain/entities';

@Component({
  selector: 'app-plans-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, ButtonComponent, BadgeComponent, SkeletonComponent],
  templateUrl: './plans-list.component.html',
})
export class PlansListComponent {
  plans = input<Plan[]>([]);
  loading = input(false);
  createClicked = output<void>();
  editClicked = output<Plan>();
  deleteClicked = output<Plan>();

  formatMoney(amount: number, currency: Currency): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getDaysUntil(plan: Plan): number {
    const today = new Date();
    const billing = new Date(plan.nextBillingDate);
    const diff = billing.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}