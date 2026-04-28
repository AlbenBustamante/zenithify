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
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50/80 py-12 px-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-xl mb-4">
            <svg class="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900">Recuperar Contraseña</h2>
          <p class="mt-2 text-sm text-gray-600">
            ¿Recordaste tu contraseña?
            <a routerLink="/auth/login" class="font-medium text-primary-600 hover:text-primary-700">
              Inicia sesión
            </a>
          </p>
        </div>

        <app-card>
          @if (!successMessage()) {
            <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
              <app-input
                formControlName="email"
                label="Email"
                type="email"
                placeholder="tu@email.com"
                [error]="form.controls['email'].invalid && form.controls['email'].touched ? 'Email requerido' : ''"
              />

              @if (errorMessage()) {
                <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p class="text-sm text-red-700">{{ errorMessage() }}</p>
                </div>
              }

              <app-button
                type="submit"
                [loading]="isLoading()"
                [disabled]="form.invalid"
                class="w-full"
              >
                Enviar Instrucciones
              </app-button>
            </form>
          } @else {
            <div class="text-center">
              <div class="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p class="text-gray-700 mb-2">{{ successMessage() }}</p>
              <p class="text-sm text-gray-500">Revisa tu bandeja de entrada</p>
              <div class="mt-4">
                <a routerLink="/auth/login" class="text-sm font-medium text-primary-600 hover:text-primary-700">
                  Volver al inicio de sesión
                </a>
              </div>
            </div>
          }
        </app-card>
      </div>
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
