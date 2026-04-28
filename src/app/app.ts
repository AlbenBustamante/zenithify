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
        <button
          (click)="toggleMobileMenu()"
          class="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
        >
          <svg class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            @if (mobileMenuOpen()) {
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            } @else {
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>

        <aside
          [class]="sidebarClasses"
        >
          <div class="flex flex-col h-full">
            <div class="p-4 border-b border-gray-200">
              <a routerLink="/dashboard" class="flex items-center gap-2 text-xl font-bold text-primary-600">
                <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M2 17l10 5 10-5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M2 12l10 5 10-5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="hidden lg:block">Zenithify</span>
              </a>
            </div>

            <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
              @for (item of navItems(); track item.route) {
                <a
                  [routerLink]="item.route"
                  [class]="getNavLinkClasses(item.route)"
                  (click)="closeMobileMenu()"
                >
                  <span [innerHTML]="item.icon" class="mr-3"></span>
                  <span class="hidden lg:inline">{{ item.label }}</span>
                </a>
              }
            </nav>

            <div class="p-3 border-t border-gray-200 space-y-1">
              <a
                routerLink="/settings"
                [class]="getNavLinkClasses('/settings')"
                (click)="closeMobileMenu()"
              >
                <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span class="hidden lg:inline">Configuración</span>
              </a>
              <button
                (click)="signOut()"
                class="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <svg class="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span class="hidden lg:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </aside>

        @if (mobileMenuOpen()) {
          <div
            class="lg:hidden fixed inset-0 bg-gray-900/50 z-30"
            (click)="closeMobileMenu()"
          ></div>
        }
      }
      <main [class]="mainClasses">
        <router-outlet />
      </main>
    </div>
  `,
})
export class App implements OnInit {
  private auth = inject(SupabaseAuthAdapter);
  private router = inject(Router);

  isAuthenticated = signal(false);
  mobileMenuOpen = signal(false);

  navItems = computed<NavItem[]>(() => [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>'
    },
    {
      label: 'Gastos',
      route: '/expenses',
      icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
    },
    {
      label: 'Ingresos',
      route: '/incomes',
      icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 112 2h-2a2 2 0 012 2v2m-6 9h6a2 2 0 002-2v-6a2 2 0 00-2-2h-6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>'
    },
    {
      label: 'Presupuestos',
      route: '/budgets',
      icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>'
    },
    {
      label: 'Planes',
      route: '/plans',
      icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>'
    },
    {
      label: 'Tareas',
      route: '/tasks',
      icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>'
    },
    {
      label: 'Marcadores',
      route: '/bookmarks',
      icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>'
    },
    {
      label: 'Categorías',
      route: '/categories',
      icon: '<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>'
    },
  ]);

  get sidebarClasses(): string {
    const base = 'fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-200 ease-in-out';
    const mobileOpen = this.mobileMenuOpen() ? 'translate-x-0' : '-translate-x-full';
    const desktopVisible = 'lg:translate-x-0';
    return [base, mobileOpen, desktopVisible].join(' ');
  }

  get mainClasses(): string {
    return this.isAuthenticated()
      ? 'lg:ml-64 pt-16 lg:pt-0'
      : '';
  }

  async ngOnInit(): Promise<void> {
    this.auth.onAuthStateChange((user) => {
      this.isAuthenticated.set(!!user);
    });

    const user = await this.auth.getCurrentUser();
    this.isAuthenticated.set(!!user);
  }

  getNavLinkClasses(route: string): string {
    const isActive = this.router.url === route || this.router.url.startsWith(route + '/');
    const base = 'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors';
    const active = isActive
      ? 'bg-primary-50 text-primary-700'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100';
    return [base, active].join(' ');
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.router.navigate(['/auth/login']);
  }
}
