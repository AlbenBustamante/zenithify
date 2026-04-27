import { Routes } from '@angular/router';
import { authGuard } from '../../shared/guards/auth.guard';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [authGuard],
  },
];