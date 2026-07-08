import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { SkeletonComponent } from '../../shared/ui/components/skeleton/skeleton.component';
import { SupabaseAuthAdapter } from '../../core/infrastructure/supabase/adapters/supabase-auth.adapter';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, SelectComponent, SkeletonComponent],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(SupabaseAuthAdapter);

  profileForm = this.fb.group({
    displayName: [''],
    email: [{ value: '', disabled: true }],
  });

  passwordForm = this.fb.group({
    newPassword: [''],
    confirmPassword: [''],
  });

  timezoneForm = this.fb.group({
    timezone: ['America/Caracas'],
  });

  isLoading = signal(false);
  isDataLoading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      await this.loadProfile();
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