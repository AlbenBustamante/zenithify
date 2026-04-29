import { Component, input, ChangeDetectionStrategy, computed } from '@angular/core';

@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card.component.html',
})
export class CardComponent {
  readonly title = input<string>();
  readonly subtitle = input<string>();

  readonly hasTitle = computed(() => !!this.title());
}
