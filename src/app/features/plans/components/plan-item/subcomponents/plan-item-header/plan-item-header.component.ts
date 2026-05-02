import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-plan-item-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-item-header.component.html',
})
export class PlanItemHeaderComponent {
  name = input.required<string>();
  provider = input.required<string>();
}