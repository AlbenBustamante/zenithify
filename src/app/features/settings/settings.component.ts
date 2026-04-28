import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { Currency } from '../../core/domain/entities';
import { CurrencyConversionService } from '../../core/domain/services';
import { SupabaseAuthAdapter } from '../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { SupabaseExchangeRateRepository } from '../../core/infrastructure/supabase/adapters/supabase-exchange-rate.repository';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, SelectComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-stone-100 px-4 py-8">
      <div class="max-w-3xl mx-auto space-y-8">

        <header class="animate-slide-up">
          <div class="space-y-2">
            <div class="flex items-center gap-3">
              <span class="w-1 h-8 bg-slate-600 rounded-full"></span>
              <h1 class="text-4xl font-bold text-slate-900 tracking-tight">Configuración</h1>
            </div>
            <p class="text-slate-500 text-sm">Gestiona tu cuenta y preferencias</p>
          </div>
        </header>

        <app-card title="Perfil" class="animate-slide-up stagger-1">
          <form [formGroup]="profileForm" class="space-y-5">
            <app-input formControlName="displayName" label="Nombre" />
            <app-input formControlName="email" label="Email" type="email" />
            <div>
              <app-button variant="secondary" (clicked)="saveProfile()" [loading]="isLoading()">Guardar Cambios</app-button>
            </div>
          </form>
        </app-card>

        <app-card title="Moneda Preferida" class="animate-slide-up stagger-2">
          <form [formGroup]="currencyForm" class="space-y-5">
            <app-select formControlName="defaultCurrency" label="Moneda por defecto">
              <option value="USD">USD - Dólar estadounidense</option>
              <option value="VES">VES - Bolívar venezolano</option>
            </app-select>
            <div>
              <app-button variant="secondary" (clicked)="saveCurrency()" [loading]="isLoading()">Guardar Cambios</app-button>
            </div>
          </form>
        </app-card>

        <app-card title="Tasa de Cambio USD/VES" class="animate-slide-up stagger-3">
          <div class="space-y-5">
            <div class="flex items-center gap-4 p-4 bg-slate-50/80 rounded-xl">
              <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div class="flex-1">
                <p class="text-sm text-slate-600">Tasa oficial del día</p>
                <p class="text-lg font-bold text-slate-900">{{ officialRate() }}</p>
              </div>
              <app-button variant="ghost" size="sm" (clicked)="refreshOfficialRate()">Actualizar</app-button>
            </div>
            <form [formGroup]="exchangeForm" class="space-y-5">
              <app-input
                formControlName="customRate"
                label="Mi tasa personalizada"
                type="number"
                placeholder="Ej: 50"
                hint="Esta tasa override la oficial para todos los cálculos"
              />
              <div>
                <app-button variant="secondary" (clicked)="saveExchangeRate()" [loading]="isLoading()">Guardar Tasa</app-button>
              </div>
            </form>
          </div>
        </app-card>

        <app-card title="Cambiar Contraseña" class="animate-slide-up stagger-4">
          <form [formGroup]="passwordForm" class="space-y-5">
            <app-input formControlName="newPassword" label="Nueva Contraseña" type="password" />
            <app-input formControlName="confirmPassword" label="Confirmar Contraseña" type="password" />
            <div>
              <app-button variant="secondary" (clicked)="changePassword()" [loading]="isLoading()">Cambiar Contraseña</app-button>
            </div>
          </form>
        </app-card>

        <app-card title="Zona Horaria" class="animate-slide-up stagger-5">
          <form [formGroup]="timezoneForm" class="space-y-5">
            <app-select formControlName="timezone" label="Zona horaria">
              <option value="America/Caracas">América/Caracas (VET)</option>
              <option value="America/New_York">América/Nueva York (EST)</option>
              <option value="Europe/Madrid">Europa/Madrid (CET)</option>
              <option value="UTC">UTC</option>
            </app-select>
            <div>
              <app-button variant="secondary" (clicked)="saveTimezone()" [loading]="isLoading()">Guardar Cambios</app-button>
            </div>
          </form>
        </app-card>
      </div>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(SupabaseAuthAdapter);
  private exchangeRateRepo = inject(SupabaseExchangeRateRepository);
  private currencyService = inject(CurrencyConversionService);

  profileForm = this.fb.group({
    displayName: [''],
    email: [{ value: '', disabled: true }],
  });

  currencyForm = this.fb.group({
    defaultCurrency: ['USD' as Currency],
  });

  exchangeForm = this.fb.group({
    customRate: [null as number | null],
  });

  passwordForm = this.fb.group({
    newPassword: [''],
    confirmPassword: [''],
  });

  timezoneForm = this.fb.group({
    timezone: ['America/Caracas'],
  });

  officialRate = signal(0);
  customRate = signal<number | null>(null);
  isLoading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
    await this.loadExchangeRate();
    await this.refreshOfficialRate();
  }

  async loadProfile(): Promise<void> {
    const user = await this.auth.getCurrentUser();
    if (user) {
      this.profileForm.patchValue({
        displayName: user.displayName ?? '',
        email: user.email,
      });
      this.currencyForm.patchValue({
        defaultCurrency: user.defaultCurrency,
      });
    }
  }

  async loadExchangeRate(): Promise<void> {
    const rate = await this.exchangeRateRepo.findByUserAndPair('', 'VES', 'USD');
    if (rate) {
      this.customRate.set(rate.rate);
      this.exchangeForm.patchValue({ customRate: rate.rate });
    }
  }

  async refreshOfficialRate(): Promise<void> {
    try {
      const rate = await this.currencyService.fetchOfficialVESRate(environment.dolarApiUrl);
      this.officialRate.set(rate);
    } catch (error) {
      console.error('Error fetching official rate:', error);
    }
  }

  async saveProfile(): Promise<void> {
    this.isLoading.set(true);
    try {
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveCurrency(): Promise<void> {
    this.isLoading.set(true);
    try {
    } catch (error) {
      console.error('Error saving currency:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveExchangeRate(): Promise<void> {
    const rate = this.exchangeForm.value.customRate;
    if (!rate) return;

    this.isLoading.set(true);
    try {
      await this.exchangeRateRepo.upsert('', 'VES', 'USD', rate);
      this.customRate.set(rate);
    } catch (error) {
      console.error('Error saving exchange rate:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async changePassword(): Promise<void> {
    if (this.passwordForm.value.newPassword !== this.passwordForm.value.confirmPassword) {
      return;
    }
    this.isLoading.set(true);
    try {
      await this.auth.updatePassword(this.passwordForm.value.newPassword!);
      this.passwordForm.reset();
    } catch (error) {
      console.error('Error changing password:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveTimezone(): Promise<void> {
    this.isLoading.set(true);
    try {
    } catch (error) {
      console.error('Error saving timezone:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}