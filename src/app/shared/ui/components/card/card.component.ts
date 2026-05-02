import { Component, input, ChangeDetectionStrategy, computed } from '@angular/core';

@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card.component.html',
  host: {
    class: 'block rounded-2xl'
  }
})
export class CardComponent {
  readonly title = input<string>();
  readonly subtitle = input<string>();
  readonly noPadding = input(false);
  readonly filled = input(false);

  readonly hasTitle = computed(() => !!this.title());
}
