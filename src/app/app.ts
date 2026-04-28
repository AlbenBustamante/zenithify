import { Component, signal, inject, OnInit, computed, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { SupabaseAuthAdapter } from './core/infrastructure/supabase/adapters';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50/80">
      @if (isAuthenticated()) {
        <header class="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
              <div class="flex items-center gap-8">
                <a routerLink="/dashboard" class="flex items-center gap-2 text-xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
                  <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 17l10 5 10-5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M2 12l10 5 10-5" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>Zenithify</span>
                </a>
                <nav class="hidden md:flex items-center gap-1">
                  @for (item of navItems(); track item.route) {
                    <a
                      [routerLink]="item.route"
                      [class]="getNavLinkClasses(item.route)"
                    >
                      <span [innerHTML]="item.icon" class="sr-only">{{ item.label }}</span>
                      {{ item.label }}
                    </a>
                  }
                </nav>
              </div>
              <div class="flex items-center gap-2">
                <a
                  routerLink="/settings"
                  class="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Configuración"
                >
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </a>
                <button
                  (click)="signOut()"
                  class="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Cerrar Sesión"
                >
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>
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
  currentRoute = signal('');

  navItems = computed<NavItem[]>(() => [
    { label: 'Dashboard', route: '/dashboard', icon: '' },
    { label: 'Gastos', route: '/expenses', icon: '' },
    { label: 'Ingresos', route: '/incomes', icon: '' },
    { label: 'Presupuestos', route: '/budgets', icon: '' },
    { label: 'Planes', route: '/plans', icon: '' },
    { label: 'Tareas', route: '/tasks', icon: '' },
    { label: 'Marcadores', route: '/bookmarks', icon: '' },
    { label: 'Categorías', route: '/categories', icon: '' },
  ]);

  async ngOnInit(): Promise<void> {
    this.auth.onAuthStateChange((user) => {
      this.isAuthenticated.set(!!user);
    });

    const user = await this.auth.getCurrentUser();
    this.isAuthenticated.set(!!user);
  }

  getNavLinkClasses(route: string): string {
    const isActive = this.router.url === route || this.router.url.startsWith(route + '/');
    const base = 'px-3 py-2 text-sm font-medium rounded-lg transition-colors';
    const active = isActive
      ? 'bg-primary-50 text-primary-700'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';
    return [base, active].join(' ');
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.router.navigate(['/auth/login']);
  }
}
