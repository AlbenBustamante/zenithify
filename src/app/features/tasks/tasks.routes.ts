import { Routes } from '@angular/router';
import { authGuard } from '../../shared/guards/auth.guard';
import { taskOwnerGuard } from '../../shared/guards/task-owner.guard';

export const TASKS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/tasks-list.component').then((m) => m.TasksListComponent),
      },
      {
        path: ':id',
        canActivate: [authGuard, taskOwnerGuard],
        loadComponent: () => import('./pages/tasks-board.component').then((m) => m.TasksBoardComponent),
      },
    ],
  },
];
