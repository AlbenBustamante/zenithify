import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CardComponent } from '../../../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';
import { SkeletonComponent } from '../../../../shared/ui/components/skeleton/skeleton.component';
import { PlanItemComponent } from '../plan-item/plan-item.component';
import { Plan } from '../../../../core/domain/entities';

@Component({
  selector: 'app-plans-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, ButtonComponent, SkeletonComponent, PlanItemComponent],
  templateUrl: './plans-list.component.html',
  host: {
    class: 'overflow-visible'
  }
})
export class PlansListComponent {
  plans = input<Plan[]>([]);
  loading = input(false);
  createClicked = output<void>();
  editClicked = output<Plan>();
  deleteClicked = output<Plan>();
}