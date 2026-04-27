import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent, InputComponent, ButtonComponent } from '../../../shared/ui/components';
import { SupabaseAuthAdapter } from '../../../core/infrastructure/supabase/adapters';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, CardComponent, InputComponent, ButtonComponent, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <app-card class="w-full max-w-md">
        <div class="mb-6">
          <h2 class="text-center text-2xl font-bold text-gray-900">Crear Cuenta</h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            ¿Ya tienes cuenta?
            <a routerLink="/auth/login" class="font-medium text-primary-600 hover:text-primary-500">
              Inicia Sesión
            </a>
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <app-input
            formControlName="displayName"
            label="Nombre completo"
            placeholder="Juan Pérez"
            [error]="form.controls['displayName'].invalid && form.controls['displayName'].touched ? 'Nombre requerido' : ''"
          />

          <app-input
            formControlName="email"
            label="Email"
            type="email"
            placeholder="tu@email.com"
            [error]="form.controls['email'].invalid && form.controls['email'].touched ? 'Email requerido' : ''"
          />

          <app-input
            formControlName="password"
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            hint="Mínimo 8 caracteres"
            [error]="form.controls['password'].invalid && form.controls['password'].touched ? 'Contraseña requerida (mín 8 chars)' : ''"
          />

          <app-input
            formControlName="confirmPassword"
            label="Confirmar Contraseña"
            type="password"
            placeholder="••••••••"
            [error]="form.controls['confirmPassword'].invalid && form.controls['confirmPassword'].touched ? 'Las contraseñas no coinciden' : ''"
          />

          <div class="flex items-center">
            <input
              id="terms"
              type="checkbox"
              formControlName="acceptTerms"
              class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label for="terms" class="ml-2 block text-sm text-gray-900">
              Acepto los <a href="#" class="text-primary-600 hover:text-primary-500">Términos de Servicio</a>
            </label>
          </div>

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
            [disabled]="form.invalid || !form.value.acceptTerms"
            class="w-full"
          >
            Crear Cuenta
          </app-button>
        </form>

        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="bg-white px-2 text-gray-500">O regístrate con</span>
            </div>
          </div>

          <div class="mt-4">
            <app-button
              variant="secondary"
              (clicked)="signInWithGoogle()"
              class="w-full"
            >
              <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </app-button>
          </div>
        </div>
      </app-card>
    </div>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(SupabaseAuthAdapter);
  private router = inject(Router);

  form = this.fb.group({
    displayName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
    acceptTerms: [false, [Validators.requiredTrue]],
  });

  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  onSubmit(): void {
    if (this.form.invalid) return;

    if (this.form.value.password !== this.form.value.confirmPassword) {
      this.errorMessage.set('Las contraseñas no coinciden');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.auth.signUpWithEmail(
      this.form.value.email!,
      this.form.value.password!,
      this.form.value.displayName!
    ).then(() => {
      this.successMessage.set('Cuenta creada. Revisa tu email para confirmar.');
      setTimeout(() => this.router.navigate(['/auth/login']), 3000);
    }).catch(() => {
      this.errorMessage.set('Error al crear la cuenta');
    }).finally(() => {
      this.isLoading.set(false);
    });
  }

  async signInWithGoogle(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.auth.signInWithGoogle();
      this.router.navigate(['/dashboard']);
    } catch (error) {
      this.errorMessage.set('Error con Google OAuth');
    } finally {
      this.isLoading.set(false);
    }
  }
}