import { Routes } from '@angular/router';
import { authGuard } from '../../shared/guards/auth.guard';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./settings.component').then((m) => m.SettingsComponent),
    canActivate: [authGuard],
  },
];