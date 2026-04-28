import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-md transition-shadow duration-300">
      @if (title()) {
        <div class="px-6 py-4 border-b border-slate-100/60">
          <h3 class="text-sm font-mono font-bold text-slate-600 uppercase tracking-wider">{{ title() }}</h3>
          @if (subtitle()) {
            <p class="text-sm text-slate-400 mt-0.5">{{ subtitle() }}</p>
          }
        </div>
      }
      <div [class]="contentClasses">
        <ng-content />
      </div>
    </div>
  `,
})
export class CardComponent {
  title = input<string>();
  subtitle = input<string>();
  noPadding = input(false);

  get contentClasses(): string {
    return this.noPadding() ? 'p-0' : 'px-6 py-5';
  }
}
