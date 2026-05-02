import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { BadgeComponent } from '../../../../../../shared/ui/components/badge/badge.component';

@Component({
  selector: 'app-plan-item-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent],
  templateUrl: './plan-item-header.component.html',
})
export class PlanItemHeaderComponent {
  name = input.required<string>();
  provider = input.required<string>();
  isActive = input.required<boolean>();
}