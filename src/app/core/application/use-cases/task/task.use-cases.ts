import { inject, Injectable } from '@angular/core';
import { TASK_PORT, QUOTA_REPOSITORY_PORT } from '../../ports/ports.tokens';
import { CreateTaskDto, UpdateTaskDto, TaskFilters } from '../../ports/inbound/task-port';
import { QuotaRepositoryPort } from '../../ports/outbound/quota-repository-port';
import { Task, TaskDeleteMode, TaskStatus } from '../../../domain/entities';
import { QuotaEnforcementService } from '../../../domain/services';
import { FREEMIUM_LIMITS, QuotaStatusVO } from '../../../domain/value-objects';

@Injectable({ providedIn: 'root' })
export class CreateTaskUseCase {
  private taskPort = inject(TASK_PORT);
  private quotaRepo = inject(QUOTA_REPOSITORY_PORT);
  private quotaService = inject(QuotaEnforcementService);

  async execute(dto: CreateTaskDto, userId: string, isPremium: boolean): Promise<Task> {
    const quota = await this.quotaRepo.findByUserId(userId);
    if (!quota) throw new Error('Quota not found');

    const quotaStatus = this.quotaService.checkQuota(quota, 'task', isPremium);
    if (quotaStatus.isExceeded) {
      throw new Error(`Freemium limit reached. Upgrade to premium to add more tasks.`);
    }

    const task = await this.taskPort.create(dto);
    await this.quotaRepo.incrementQuota(userId, 'task');
    return task;
  }
}

@Injectable({ providedIn: 'root' })
export class UpdateTaskUseCase {
  private taskPort = inject(TASK_PORT);

  async execute(id: string, dto: UpdateTaskDto): Promise<Task> {
    return this.taskPort.update(id, dto);
  }
}

@Injectable({ providedIn: 'root' })
export class DeleteTaskUseCase {
  private taskPort = inject(TASK_PORT);
  private quotaRepo = inject(QUOTA_REPOSITORY_PORT);

  async execute(id: string, userId: string): Promise<void> {
    const task = await this.taskPort.findById(id);
    if (!task) throw new Error('Task not found');

    await this.taskPort.delete(id);
    await this.quotaRepo.decrementQuota(userId, 'task');
  }
}

@Injectable({ providedIn: 'root' })
export class CompleteTaskUseCase {
  private taskPort = inject(TASK_PORT);

  async execute(id: string): Promise<Task> {
    return this.taskPort.update(id, { status: 'completed' });
  }
}

@Injectable({ providedIn: 'root' })
export class ListTasksUseCase {
  private taskPort = inject(TASK_PORT);

  async execute(filters?: TaskFilters): Promise<Task[]> {
    return this.taskPort.findAll(filters);
  }
}

@Injectable({ providedIn: 'root' })
export class ListTopLevelTasksUseCase {
  private taskPort = inject(TASK_PORT);

  async execute(): Promise<Task[]> {
    return this.taskPort.findByParent(null);
  }
}

@Injectable({ providedIn: 'root' })
export class ListTaskChildrenUseCase {
  private taskPort = inject(TASK_PORT);

  async execute(parentTaskId: string): Promise<Task[]> {
    return this.taskPort.findByParent(parentTaskId);
  }
}

@Injectable({ providedIn: 'root' })
export class GetTaskByIdUseCase {
  private taskPort = inject(TASK_PORT);

  async execute(id: string): Promise<Task | null> {
    return this.taskPort.findById(id);
  }
}

@Injectable({ providedIn: 'root' })
export class GetPendingTasksUseCase {
  private taskPort = inject(TASK_PORT);

  async execute(): Promise<Task[]> {
    return this.taskPort.findPending();
  }
}

@Injectable({ providedIn: 'root' })
export class GetOverdueTasksUseCase {
  private taskPort = inject(TASK_PORT);

  async execute(): Promise<Task[]> {
    return this.taskPort.findOverdue();
  }
}

@Injectable({ providedIn: 'root' })
export class DeleteTaskWithChildrenStrategyUseCase {
  private taskPort = inject(TASK_PORT);
  private quotaRepo = inject(QUOTA_REPOSITORY_PORT);

  async execute(taskId: string, userId: string, mode: TaskDeleteMode): Promise<void> {
    if (mode === 'cancel') return;

    const task = await this.taskPort.findById(taskId);
    if (!task) throw new Error('Task not found');

    const children = await this.taskPort.findByParent(taskId);
    const totalToDelete = 1 + children.length;

    if (mode === 'orphan') {
      for (const child of children) {
        await this.taskPort.update(child.id, { parentTaskId: null });
      }
    }

    await this.taskPort.delete(taskId);

    for (let i = 0; i < totalToDelete; i++) {
      await this.quotaRepo.decrementQuota(userId, 'task');
    }
  }
}

@Injectable({ providedIn: 'root' })
export class SetTaskParentUseCase {
  private taskPort = inject(TASK_PORT);

  async execute(taskId: string, newParentId: string | null, userId: string): Promise<Task> {
    if (newParentId) {
      const parent = await this.taskPort.findById(newParentId);
      if (!parent) throw new Error('Parent task not found');
      if (parent.userId !== userId) throw new Error('Parent task does not belong to user');
      if (await this.wouldCreateCycle(taskId, newParentId)) {
        throw new Error('Cannot nest a task under one of its descendants');
      }
    }
    return this.taskPort.update(taskId, { parentTaskId: newParentId });
  }

  private async wouldCreateCycle(taskId: string, candidateParentId: string): Promise<boolean> {
    let current: string | null = candidateParentId;
    const visited = new Set<string>();
    while (current) {
      if (current === taskId) return true;
      if (visited.has(current)) return true;
      visited.add(current);
      const node: Task | null = await this.taskPort.findById(current);
      current = node?.parentTaskId ?? null;
    }
    return false;
  }
}

export const __deriveStatusForTests = (children: Task[]): TaskStatus => {
  if (children.length === 0) return 'pending';
  if (children.every((c) => c.status === 'completed')) return 'completed';
  if (children.some((c) => c.status === 'in_progress')) return 'in_progress';
  return 'pending';
};
