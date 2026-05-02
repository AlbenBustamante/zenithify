import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  signal,
  inject,
  ComponentRef,
  createComponent,
  EnvironmentInjector,
  ChangeDetectorRef,
  Renderer2,
} from '@angular/core';

@Component({
  selector: 'app-plan-item-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-item-menu.component.html',
})
export class PlanItemMenuComponent {
  planName = input.required<string>();
  editClicked = output<void>();
  deleteClicked = output<void>();

  private envInjector = inject(EnvironmentInjector);
  private cdr = inject(ChangeDetectorRef);
  private renderer = inject(Renderer2);

  menuOpen = signal(false);
  private menuComponentRef: ComponentRef<MenuDropdownComponent> | null = null;

  toggleMenu(): void {
    if (this.menuOpen()) {
      this.closeMenu();
    } else {
      this.menuOpen.set(true);
      this.openMenu();
    }
    this.cdr.markForCheck();
  }

  private openMenu(): void {
    setTimeout(() => {
      const button = document.querySelector(`[aria-label="Menú de acciones para ${this.planName()}"]`) as HTMLButtonElement;
      if (!button) return;

      const buttonRect = button.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const menuWidth = 160;
      const menuHeight = 112;
      const offset = 10;

      const spaceBelow = viewportHeight - buttonRect.bottom - offset;
      const spaceAbove = buttonRect.top - offset;

      const openBelow = spaceBelow >= menuHeight || spaceBelow >= spaceAbove;

      let left = buttonRect.left + buttonRect.width / 2 - menuWidth / 2;
      let top = openBelow ? buttonRect.bottom + offset : buttonRect.top - menuHeight - offset;

      if (left < 12) left = 12;
      if (left + menuWidth > window.innerWidth - 12) left = window.innerWidth - menuWidth - 12;

      this.menuComponentRef = createComponent(MenuDropdownComponent, {
        environmentInjector: this.envInjector,
      });

      this.menuComponentRef.setInput('planName', this.planName());
      this.menuComponentRef.setInput('top', top);
      this.menuComponentRef.setInput('left', left);
      this.menuComponentRef.setInput('openBelow', openBelow);

      this.menuComponentRef.instance.editClicked.subscribe(() => {
        this.closeMenu();
        setTimeout(() => this.editClicked.emit(), 50);
      });

      this.menuComponentRef.instance.deleteClicked.subscribe(() => {
        this.closeMenu();
        setTimeout(() => this.deleteClicked.emit(), 50);
      });

      this.menuComponentRef.instance.close.subscribe(() => {
        this.closeMenu();
      });

      this.renderer.appendChild(document.body, this.menuComponentRef.location.nativeElement);

      const menuEl = this.menuComponentRef.location.nativeElement.querySelector('.menu-dropdown') as HTMLElement;
      if (menuEl) {
        this.renderer.setStyle(menuEl, 'top', top + 'px');
        this.renderer.setStyle(menuEl, 'left', left + 'px');
        this.renderer.setStyle(menuEl, 'opacity', '0');
        this.renderer.setStyle(menuEl, 'transform', 'translateY(-6px)');
        this.renderer.setStyle(menuEl, 'transition', 'opacity 180ms ease-out, transform 180ms ease-out');

        requestAnimationFrame(() => {
          this.renderer.setStyle(menuEl, 'opacity', '1');
          this.renderer.setStyle(menuEl, 'transform', 'translateY(0)');
        });
      }
    }, 0);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
    this.destroyMenu();
  }

  private destroyMenu(): void {
    if (this.menuComponentRef) {
      const element = this.menuComponentRef.location.nativeElement;
      this.menuComponentRef.destroy();
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      this.menuComponentRef = null;
    }
  }
}

@Component({
  selector: 'app-menu-dropdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="menu-dropdown fixed z-[100] w-40 rounded-xl bg-white shadow-xl border border-slate-100 py-1.5"
         role="menu"
         [attr.aria-label]="'Acciones para ' + planName()"
         [style.top.px]="top()"
         [style.left.px]="left()">
      <button type="button"
              class="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors focus:outline-none focus:bg-slate-50 cursor-pointer"
              role="menuitem"
              (click)="editClicked.emit()">
        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
        </svg>
        Editar
      </button>
      <button type="button"
              class="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors focus:outline-none focus:bg-red-50 cursor-pointer"
              role="menuitem"
              (click)="deleteClicked.emit()">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Eliminar
      </button>
    </div>
    <div class="menu-backdrop fixed inset-0 z-[99]" (click)="close.emit()"></div>
  `,
})
export class MenuDropdownComponent {
  planName = input.required<string>();
  top = input<number>(0);
  left = input<number>(0);
  openBelow = input<boolean>(true);
  editClicked = output<void>();
  deleteClicked = output<void>();
  close = output<void>();
}