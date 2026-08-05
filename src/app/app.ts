import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SupabaseAuthAdapter } from './core/infrastructure/supabase/adapters';
import { ToastService } from './shared/services/toast.service';
import { ToastComponent } from './shared/ui/components';

interface NavItem {
  label: string;
  route: string;
  icon: SafeHtml;
}

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, ToastComponent],
  templateUrl: './app.component.html',
})
export class App implements OnInit {
  private auth = inject(SupabaseAuthAdapter);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  protected toast = inject(ToastService);

  isAuthenticated = signal(false);
  mobileMenuOpen = signal(false);
  navItems = signal<NavItem[]>([]);

  ngOnInit(): void {
    this.loadNavItems();

    this.auth.onAuthStateChange((user) => {
      this.isAuthenticated.set(!!user);
    });

    this.auth.getCurrentUser().then((user) => {
      this.isAuthenticated.set(!!user);
    });
  }

  private loadNavItems(): void {
    const items = [
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
    ];

    this.navItems.set(
      items.map((item) => ({
        ...item,
        icon: this.sanitizer.bypassSecurityTrustHtml(item.icon),
      }))
    );
  }

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