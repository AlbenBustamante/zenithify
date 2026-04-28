import { Component, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../../shared/ui/components/card/card.component';
import { InputComponent } from '../../../shared/ui/components/input/input.component';
import { ButtonComponent } from '../../../shared/ui/components/button/button.component';
import { SupabaseAuthAdapter } from '../../../core/infrastructure/supabase/adapters/supabase-auth.adapter';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, CardComponent, InputComponent, ButtonComponent, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <app-card class="w-full max-w-md">
        <div class="mb-6">
          <h2 class="text-center text-2xl font-bold text-gray-900">Recuperar Contraseña</h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <app-input
            formControlName="email"
            label="Email"
            type="email"
            placeholder="tu@email.com"
            [error]="form.controls['email'].invalid && form.controls['email'].touched ? 'Email requerido' : ''"
          />

          @if (errorMessage()) {
            <div class="rounded-md bg-red-50 p-3">
              <p class="text-sm text-red-800">{{ errorMessage() }}</p>
            </div>
          }

          @if (successMessage()) {
            <div class="rounded-md bg-green-50 p-3">
              <p class="text-sm text-green-800">{{ successMessage() }}</p>
            </div>
          }

          <app-button
            type="submit"
            [loading]="isLoading()"
            [disabled]="form.invalid"
            class="w-full"
          >
            Enviar Enlace
          </app-button>

          <div class="text-center">
            <a routerLink="/auth/login" class="text-sm font-medium text-primary-600 hover:text-primary-500">
              Volver a Iniciar Sesión
            </a>
          </div>
        </form>
      </app-card>
    </div>
  `,
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

  onSubmit(): void {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.auth.resetPassword(this.form.value.email!)
      .then(() => {
        this.successMessage.set('Revisa tu email para restablecer tu contraseña');
        this.form.reset();
      })
      .catch(() => {
        this.errorMessage.set('Error al enviar el email');
      })
      .finally(() => {
        this.isLoading.set(false);
      });
  }
}