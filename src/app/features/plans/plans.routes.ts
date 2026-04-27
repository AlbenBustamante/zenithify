import { Routes } from '@angular/router';
import { authGuard } from '../../shared/guards/auth.guard';

export const PLANS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./plans.component').then((m) => m.PlansComponent),
    canActivate: [authGuard],
  },
];