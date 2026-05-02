import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { PlanItemHeaderComponent } from './subcomponents/plan-item-header/plan-item-header.component';
import { PlanItemPricingComponent } from './subcomponents/plan-item-pricing/plan-item-pricing.component';
import { PlanItemBillingComponent } from './subcomponents/plan-item-billing/plan-item-billing.component';
import { PlanItemMenuComponent } from './subcomponents/plan-item-menu/plan-item-menu.component';
import { BadgeComponent } from '../../../../shared/ui/components/badge/badge.component';
import { Plan } from '../../../../core/domain/entities';

@Component({
  selector: 'app-plan-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PlanItemHeaderComponent,
    PlanItemPricingComponent,
    PlanItemBillingComponent,
    PlanItemMenuComponent,
    BadgeComponent,
  ],
  templateUrl: './plan-item.component.html',
})
export class PlanItemComponent {
  plan = input.required<Plan>();
  editClicked = output<Plan>();
  deleteClicked = output<Plan>();

  handleEdit(): void {
    this.editClicked.emit(this.plan());
  }

  handleDelete(): void {
    this.deleteClicked.emit(this.plan());
  }
}