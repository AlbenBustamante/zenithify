import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  {
    path: 'expenses',
    loadChildren: () => import('./features/expenses/expenses.routes').then((m) => m.EXPENSES_ROUTES),
  },
  {
    path: 'incomes',
    loadChildren: () => import('./features/incomes/incomes.routes').then((m) => m.INCOMES_ROUTES),
  },
  {
    path: 'budgets',
    loadChildren: () => import('./features/budgets/budgets.routes').then((m) => m.BUDGETS_ROUTES),
  },
  {
    path: 'plans',
    loadChildren: () => import('./features/plans/plans.routes').then((m) => m.PLANS_ROUTES),
  },
  {
    path: 'tasks',
    loadChildren: () => import('./features/tasks/tasks.routes').then((m) => m.TASKS_ROUTES),
  },
  {
    path: 'bookmarks',
    loadChildren: () => import('./features/bookmarks/bookmarks.routes').then((m) => m.BOOKMARKS_ROUTES),
  },
  {
    path: 'categories',
    loadChildren: () => import('./features/categories/categories.routes').then((m) => m.CATEGORIES_ROUTES),
  },
  {
    path: 'settings',
    loadChildren: () => import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];