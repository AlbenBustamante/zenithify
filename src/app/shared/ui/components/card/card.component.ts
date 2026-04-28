import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      @if (title()) {
        <div class="px-6 py-4 border-b border-gray-100">
          <h3 class="text-base font-semibold text-gray-900">{{ title() }}</h3>
          @if (subtitle()) {
            <p class="text-sm text-gray-500 mt-0.5">{{ subtitle() }}</p>
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
