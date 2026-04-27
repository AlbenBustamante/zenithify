import { Routes } from '@angular/router';
import { authGuard } from '../../shared/guards/auth.guard';

export const INCOMES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./incomes.component').then((m) => m.IncomesComponent),
    canActivate: [authGuard],
  },
];