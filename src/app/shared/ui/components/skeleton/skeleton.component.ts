import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="rounded-xl bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse"
    [style.width]="width()"
    [style.height]="height()"></div>`
})
export class SkeletonComponent {
  readonly width = input<string>('100%');
  readonly height = input<string>('1rem');
}