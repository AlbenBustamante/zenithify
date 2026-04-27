import { Routes } from '@angular/router';
import { authGuard } from '../../shared/guards/auth.guard';

export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./categories.component').then((m) => m.CategoriesComponent),
    canActivate: [authGuard],
  },
];