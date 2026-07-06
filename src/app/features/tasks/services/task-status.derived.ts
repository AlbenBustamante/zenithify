import { Injectable } from '@angular/core';
import { Task, TaskStatus, TaskStatusCounts } from '../../../core/domain/entities';

@Injectable({ providedIn: 'root' })
export class TaskStatusDerivedService {
  deriveStatus(children: Task[]): TaskStatus {
    if (children.length === 0) return 'pending';
    if (children.every((c) => c.status === 'completed')) return 'completed';
    if (children.some((c) => c.status === 'in_progress')) return 'in_progress';
    return 'pending';
  }

  aggregateCounts(children: Task[]): TaskStatusCounts {
    const counts: TaskStatusCounts = { pending: 0, in_progress: 0, completed: 0 };
    for (const child of children) {
      counts[child.status]++;
    }
    return counts;
  }
}
