import { Component, input, ChangeDetectionStrategy, computed } from '@angular/core';

const gradientMap: Record<string, string> = {
  slate: 'from-slate-200 via-slate-100 to-slate-200',
  red: 'from-red-200 via-red-100 to-red-200',
  emerald: 'from-emerald-200 via-emerald-100 to-emerald-200',
  blue: 'from-blue-200 via-blue-100 to-blue-200',
  violet: 'from-violet-200 via-violet-100 to-violet-200',
  amber: 'from-amber-200 via-amber-100 to-amber-200',
  primary: 'from-primary-200 via-primary-100 to-primary-200',
};

@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skeleton.component.html',
})
export class SkeletonComponent {
  readonly width = input<string>('100%');
  readonly height = input<string>('1rem');
  readonly color = input<'slate' | 'red' | 'emerald' | 'blue' | 'violet' | 'amber' | 'primary'>('slate');

  readonly gradientClass = computed(() => gradientMap[this.color()] ?? gradientMap['slate']);
}
