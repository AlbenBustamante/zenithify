import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { ModalComponent } from '../../../../shared/ui/components/modal/modal.component';
import { ButtonComponent } from '../../../../shared/ui/components/button/button.component';

@Component({
  selector: 'app-plan-delete-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './plan-delete-modal.component.html',
})
export class PlanDeleteModalComponent {
  isOpen = input(false);
  loading = input(false);
  confirm = output<void>();
  cancel = output<void>();
}