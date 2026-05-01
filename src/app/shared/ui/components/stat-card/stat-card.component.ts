import { Component, input, ChangeDetectionStrategy, computed } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass],
  templateUrl: './stat-card.component.html',
})
export class StatCardComponent {
  readonly color = input<'red' | 'emerald' | 'blue' | 'violet' | 'amber' | 'primary'>('blue');
  readonly label = input<string>('');

  private readonly colorMap = {
    red: {
      gradientFrom: 'from-red-50',
      gradientTo: 'to-red-100',
      border: 'border-red-200/30',
      text: 'text-red-400',
      iconBg: 'bg-red-50',
      iconBorder: 'border-red-200/30',
      iconText: 'text-red-400',
      blur: 'bg-red-200/30',
    },
    emerald: {
      gradientFrom: 'from-emerald-50',
      gradientTo: 'to-emerald-100',
      border: 'border-emerald-200/30',
      text: 'text-emerald-400',
      iconBg: 'bg-emerald-50',
      iconBorder: 'border-emerald-200/30',
      iconText: 'text-emerald-400',
      blur: 'bg-emerald-200/30',
    },
    blue: {
      gradientFrom: 'from-blue-50',
      gradientTo: 'to-blue-100',
      border: 'border-blue-200/30',
      text: 'text-blue-400',
      iconBg: 'bg-blue-50',
      iconBorder: 'border-blue-200/30',
      iconText: 'text-blue-400',
      blur: 'bg-blue-200/30',
    },
    violet: {
      gradientFrom: 'from-violet-50',
      gradientTo: 'to-violet-100',
      border: 'border-violet-200/30',
      text: 'text-violet-400',
      iconBg: 'bg-violet-50',
      iconBorder: 'border-violet-200/30',
      iconText: 'text-violet-400',
      blur: 'bg-violet-200/30',
    },
    amber: {
      gradientFrom: 'from-amber-50',
      gradientTo: 'to-amber-100',
      border: 'border-amber-200/50',
      text: 'text-amber-600',
      iconBg: 'bg-amber-100/80',
      iconBorder: 'border-amber-200/50',
      iconText: 'text-amber-500',
      blur: 'bg-amber-200/50',
    },
    primary: {
      gradientFrom: 'from-primary-50',
      gradientTo: 'to-primary-100',
      border: 'border-primary-200/50',
      text: 'text-primary-600',
      iconBg: 'bg-primary-100/80',
      iconBorder: 'border-primary-200/50',
      iconText: 'text-primary-500',
      blur: 'bg-primary-200/50',
    },
  };

  readonly gradientFrom = computed(() => this.colorMap[this.color()].gradientFrom);
  readonly gradientTo = computed(() => this.colorMap[this.color()].gradientTo);
  readonly border = computed(() => this.colorMap[this.color()].border);
  readonly textColor = computed(() => this.colorMap[this.color()].text);
  readonly iconBg = computed(() => this.colorMap[this.color()].iconBg);
  readonly iconBorder = computed(() => this.colorMap[this.color()].iconBorder);
  readonly iconText = computed(() => this.colorMap[this.color()].iconText);
  readonly blur = computed(() => this.colorMap[this.color()].blur);
}