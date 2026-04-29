import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../../shared/ui/components/card/card.component';
import { InputComponent } from '../../../shared/ui/components/input/input.component';
import { ButtonComponent } from '../../../shared/ui/components/button/button.component';
import { SupabaseAuthAdapter } from '../../../core/infrastructure/supabase/adapters/supabase-auth.adapter';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, InputComponent, ButtonComponent, RouterLink],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(SupabaseAuthAdapter);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await this.auth.resetPassword(this.form.value.email!);
      this.successMessage.set('Se han enviado las instrucciones a tu email');
    } catch (error) {
      this.errorMessage.set('Error al enviar las instrucciones');
    } finally {
      this.isLoading.set(false);
    }
  }
}