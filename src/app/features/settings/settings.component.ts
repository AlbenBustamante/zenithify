import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { SkeletonComponent } from '../../shared/ui/components/skeleton/skeleton.component';
import { Currency } from '../../core/domain/entities';
import { CurrencyConversionService } from '../../core/domain/services';
import { SupabaseAuthAdapter } from '../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { SupabaseExchangeRateRepository } from '../../core/infrastructure/supabase/adapters/supabase-exchange-rate.repository';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, SelectComponent, SkeletonComponent],
  templateUrl: './settings.component.html',
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
  isDataLoading = signal(true);
  isRateLoading = signal(false);
  isRateRefreshing = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      await this.loadProfile();
      await this.loadExchangeRate();
      await this.refreshOfficialRate();
    } finally {
      this.isDataLoading.set(false);
    }
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
    const user = await this.auth.getCurrentUser();
    const userId = user?.id ?? '';
    const rate = await this.exchangeRateRepo.findByUserAndPair(userId, 'VES', 'USD');
    if (rate) {
      this.customRate.set(rate.rate);
      this.exchangeForm.patchValue({ customRate: rate.rate });
    }
  }

  async refreshOfficialRate(): Promise<void> {
    this.isRateRefreshing.set(true);
    try {
      const rate = await this.currencyService.fetchOfficialVESRate(environment.dolarApiUrl);
      this.officialRate.set(rate);
    } catch (error) {
      console.error('Error fetching official rate:', error);
    } finally {
      this.isRateRefreshing.set(false);
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

    this.isRateLoading.set(true);
    try {
      await this.exchangeRateRepo.upsert('', 'VES', 'USD', rate);
      this.customRate.set(rate);
    } catch (error) {
      console.error('Error saving exchange rate:', error);
    } finally {
      this.isRateLoading.set(false);
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