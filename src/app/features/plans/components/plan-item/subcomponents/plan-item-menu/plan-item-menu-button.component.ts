import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-plan-item-menu-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-item-menu-button.component.html',
})
export class PlanItemMenuButtonComponent {
  planName = input.required<string>();
  menuOpen = input.required<boolean>();
  toggleMenu = output<void>();
  closeMenu = output<void>();
}