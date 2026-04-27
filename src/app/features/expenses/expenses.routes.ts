import { Routes } from '@angular/router';
import { authGuard } from '../../shared/guards/auth.guard';

export const EXPENSES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./expenses.component').then((m) => m.ExpensesComponent),
    canActivate: [authGuard],
  },
];