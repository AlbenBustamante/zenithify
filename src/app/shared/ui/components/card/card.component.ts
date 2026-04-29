import { NgClass } from '@angular/common';
import { Component, input, ChangeDetectionStrategy, computed } from '@angular/core';

@Component({
  selector: 'app-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './card.component.html',
  imports: [NgClass],
})
export class CardComponent {
  readonly title = input<string>();
  readonly subtitle = input<string>();
  readonly noPadding = input(false);
  readonly filled = input(false);

  readonly isFilled = computed(() => this.filled());
  readonly hasTitle = computed(() => !!this.title());
  readonly shouldAddPadding = computed(() => !this.noPadding());
}
