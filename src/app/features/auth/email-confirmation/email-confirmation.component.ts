import { Component, input, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '../../../shared/ui/components/button/button.component';

@Component({
  selector: 'app-email-confirmation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  templateUrl: './email-confirmation.component.html',
})
export class EmailConfirmationComponent {
  email = input('');

  private router = inject(Router);

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
