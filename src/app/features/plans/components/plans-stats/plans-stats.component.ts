import { Component, ChangeDetectionStrategy } from '@angular/core';
import { StatCardComponent } from '../../../../shared/ui/components/stat-card/stat-card.component';

@Component({
  selector: 'app-plans-stats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatCardComponent],
  templateUrl: './plans-stats.component.html',
})
export class PlansStatsComponent {}