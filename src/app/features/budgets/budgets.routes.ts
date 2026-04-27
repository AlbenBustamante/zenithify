import { Routes } from '@angular/router';
import { authGuard } from '../../shared/guards/auth.guard';

export const BUDGETS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./budgets.component').then((m) => m.BudgetsComponent),
    canActivate: [authGuard],
  },
];