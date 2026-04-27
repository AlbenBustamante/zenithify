import { Component, signal, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { SupabaseAuthAdapter } from './core/infrastructure/supabase/adapters';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50">
      @if (isAuthenticated()) {
        <nav class="bg-white shadow-sm border-b border-gray-200">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex items-center gap-8">
                <a routerLink="/dashboard" class="text-xl font-bold text-primary-600">Zenithify</a>
                <div class="hidden md:flex gap-4">
                  <a routerLink="/dashboard" class="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Dashboard</a>
                  <a routerLink="/expenses" class="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Gastos</a>
                  <a routerLink="/incomes" class="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Ingresos</a>
                  <a routerLink="/budgets" class="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Presupuestos</a>
                  <a routerLink="/plans" class="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Planes</a>
                  <a routerLink="/tasks" class="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Tareas</a>
                  <a routerLink="/bookmarks" class="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Marcadores</a>
                  <a routerLink="/categories" class="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Categorías</a>
                </div>
              </div>
              <div class="flex items-center gap-4">
                <a routerLink="/settings" class="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Configuración</a>
                <button (click)="signOut()" class="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">Cerrar Sesión</button>
              </div>
            </div>
          </div>
        </nav>
      }
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <router-outlet />
      </main>
    </div>
  `,
})
export class App implements OnInit {
  private auth = inject(SupabaseAuthAdapter);
  private router = inject(Router);

  isAuthenticated = signal(false);

  async ngOnInit(): Promise<void> {
    this.auth.onAuthStateChange((user) => {
      this.isAuthenticated.set(!!user);
    });

    const user = await this.auth.getCurrentUser();
    this.isAuthenticated.set(!!user);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.router.navigate(['/auth/login']);
  }
}