import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthPort } from '../../../core/application/ports/inbound/auth-port';
import { SupabaseAuthAdapter } from '../../../core/infrastructure/supabase/adapters';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(SupabaseAuthAdapter);
  const router = inject(Router);

  const user = await authService.getCurrentUser();
  if (!user) {
    router.navigate(['/auth/login']);
    return false;
  }

  return true;
};

export const guestGuard: CanActivateFn = async () => {
  const authService = inject(SupabaseAuthAdapter);
  const router = inject(Router);

  const user = await authService.getCurrentUser();
  if (user) {
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
