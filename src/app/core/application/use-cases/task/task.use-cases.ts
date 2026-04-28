import { inject, Injectable } from '@angular/core';
import { TASK_PORT, QUOTA_REPOSITORY_PORT } from '../../ports/ports.tokens';
import { CreateTaskDto, UpdateTaskDto, TaskFilters } from '../../ports/inbound/task-port';
import { QuotaRepositoryPort } from '../../ports/outbound/quota-repository-port';
import { Task } from '../../../domain/entities';
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