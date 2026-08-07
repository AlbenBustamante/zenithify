import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../../shared/ui/components/card/card.component';
import { InputComponent } from '../../../shared/ui/components/input/input.component';
import { ButtonComponent } from '../../../shared/ui/components/button/button.component';
import { SupabaseAuthAdapter } from '../../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { EmailConfirmationComponent } from '../email-confirmation/email-confirmation.component';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, InputComponent, ButtonComponent, RouterLink, EmailConfirmationComponent],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(SupabaseAuthAdapter);
  private router = inject(Router);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  isLoading = signal(false);
  errorMessage = signal('');
  registeredEmail = signal<string | null>(null);

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    if (this.form.value.password !== this.form.value.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const user = await this.auth.signUpWithEmail(
        this.form.value.email!,
        this.form.value.password!
      );

      if (user) {
        this.router.navigate(['/dashboard']);
      } else {
        this.registeredEmail.set(this.form.value.email ?? '');
      }
    } catch (error) {
      this.errorMessage.set('Error al crear la cuenta');
    } finally {
      this.isLoading.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.auth.signInWithGoogle();
    } catch (error) {
      this.errorMessage.set('Error al iniciar sesión con Google');
    } finally {
      this.isLoading.set(false);
    }
  }
}