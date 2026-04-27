import { Component, input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-card',
  imports: [NgClass],
  template: `
    <div
      [ngClass]="cardClasses()"
      class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      @if (title()) {
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">{{ title() }}</h3>
          @if (subtitle()) {
            <p class="text-sm text-gray-500 mt-1">{{ subtitle() }}</p>
          }
        </div>
      }
      <div class="px-6 py-4" [ngClass]="{ '!px-0 !py-0': noPadding() }">
        <ng-content />
      </div>
    </div>
  `,
})
export class CardComponent {
  title = input<string>();
  subtitle = input<string>();
  noPadding = input(false);

  cardClasses(): Record<string, boolean> {
    return {
      'border-l-4 border-l-primary-500': true,
    };
  }
}