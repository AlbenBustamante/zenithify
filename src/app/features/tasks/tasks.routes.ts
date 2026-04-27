import { Routes } from '@angular/router';
import { authGuard } from '../../shared/guards/auth.guard';

export const TASKS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./tasks.component').then((m) => m.TasksComponent),
    canActivate: [authGuard],
  },
];