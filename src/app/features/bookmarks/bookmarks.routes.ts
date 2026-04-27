import { Routes } from '@angular/router';
import { authGuard } from '../../shared/guards/auth.guard';

export const BOOKMARKS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./bookmarks.component').then((m) => m.BookmarksComponent),
    canActivate: [authGuard],
  },
];