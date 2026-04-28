import { Component, signal, inject, OnInit } from '@angular/core';
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
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, SelectComponent],
  template: `
    <div class="space-y-6">
      <h1 class="text-2xl font-bold text-gray-900">Configuración</h1>

      <app-card title="Perfil">
        <form [formGroup]="profileForm" class="space-y-4">
          <app-input formControlName="displayName" label="Nombre" />
          <app-input formControlName="email" label="Email" type="email" />
          <app-button variant="secondary" (clicked)="saveProfile()">Guardar Cambios</app-button>
        </form>
      </app-card>

      <app-card title="Moneda Preferida">
        <form [formGroup]="currencyForm" class="space-y-4">
          <app-select formControlName="defaultCurrency" label="Moneda por defecto">
            <option value="USD">USD - Dólar estadounidense</option>
            <option value="VES">VES - Bolívar venezolano</option>
          </app-select>
          <app-button variant="secondary" (clicked)="saveCurrency()">Guardar Cambios</app-button>
        </form>
      </app-card>

      <app-card title="Tasa de Cambio USD/VES">
        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <p class="text-sm text-gray-500">
              Tasa oficial del día: <span class="font-medium text-gray-900">{{ officialRate() }}</span>
            </p>
            <app-button variant="ghost" size="sm" (clicked)="refreshOfficialRate()">Actualizar</app-button>
          </div>
          <form [formGroup]="exchangeForm" class="space-y-4">
            <app-input
              formControlName="customRate"
              label="Mi tasa personalizada"
              type="number"
              placeholder="Ej: 50"
              hint="Esta tasa override la oficial para todos los cálculos"
            />
            <app-button variant="secondary" (clicked)="saveExchangeRate()">Guardar Tasa</app-button>
          </form>
        </div>
      </app-card>

      <app-card title="Cambiar Contraseña">
        <form [formGroup]="passwordForm" class="space-y-4">
          <app-input formControlName="newPassword" label="Nueva Contraseña" type="password" />
          <app-input formControlName="confirmPassword" label="Confirmar Contraseña" type="password" />
          <app-button variant="secondary" (clicked)="changePassword()">Cambiar Contraseña</app-button>
        </form>
      </app-card>

      <app-card title="Zona Horaria">
        <form [formGroup]="timezoneForm" class="space-y-4">
          <app-select formControlName="timezone" label="Zona horaria">
            <option value="America/Caracas">América/Caracas (VET)</option>
            <option value="America/New_York">América/Nueva York (EST)</option>
            <option value="Europe/Madrid">Europa/Madrid (CET)</option>
            <option value="UTC">UTC</option>
          </app-select>
          <app-button variant="secondary" (clicked)="saveTimezone()">Guardar Cambios</app-button>
        </form>
      </app-card>
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
      // Implementation would update profile via use case
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveCurrency(): Promise<void> {
    this.isLoading.set(true);
    try {
      // Implementation would update currency preference
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
      // Implementation would save timezone
    } catch (error) {
      console.error('Error saving timezone:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}