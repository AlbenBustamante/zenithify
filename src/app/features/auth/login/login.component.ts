import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../../shared/ui/components/card/card.component';
import { InputComponent } from '../../../shared/ui/components/input/input.component';
import { ButtonComponent } from '../../../shared/ui/components/button/button.component';
import { SupabaseAuthAdapter } from '../../../core/infrastructure/supabase/adapters/supabase-auth.adapter';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, InputComponent, ButtonComponent, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(SupabaseAuthAdapter);
  private router = inject(Router);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  isLoading = signal(false);
  errorMessage = signal('');

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await this.auth.signInWithEmail(
        this.form.value.email!,
        this.form.value.password!
      );
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      if (error?.code === 'email_not_confirmed') {
        this.errorMessage.set('Tu email aún no ha sido confirmado. Revisa tu bandeja de entrada.');
      } else {
        this.errorMessage.set('Email o contraseña incorrectos');
      }
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