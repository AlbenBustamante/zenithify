import { inject, Injectable } from '@angular/core';
import { TaskPort, CreateTaskDto, UpdateTaskDto, TaskFilters } from '../../ports/inbound/task-port';
import { QuotaRepositoryPort } from '../../ports/outbound/quota-repository-port';
import { Task } from '../../../domain/entities';
import { QuotaEnforcementService } from '../../../domain/services';

@Injectable()
export class CreateTaskUseCase {
  private taskPort = inject(TaskPort);
  private quotaRepo = inject(QuotaRepositoryPort);
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

@Injectable()
export class UpdateTaskUseCase {
  private taskPort = inject(TaskPort);

  async execute(id: string, dto: UpdateTaskDto): Promise<Task> {
    return this.taskPort.update(id, dto);
  }
}

@Injectable()
export class DeleteTaskUseCase {
  private taskPort = inject(TaskPort);
  private quotaRepo = inject(QuotaRepositoryPort);

  async execute(id: string, userId: string): Promise<void> {
    const task = await this.taskPort.findById(id);
    if (!task) throw new Error('Task not found');

    await this.taskPort.delete(id);
    await this.quotaRepo.decrementQuota(userId, 'task');
  }
}

@Injectable()
export class CompleteTaskUseCase {
  private taskPort = inject(TaskPort);

  async execute(id: string): Promise<Task> {
    return this.taskPort.update(id, { status: 'completed' });
  }
}

@Injectable()
export class ListTasksUseCase {
  private taskPort = inject(TaskPort);

  async execute(filters?: TaskFilters): Promise<Task[]> {
    return this.taskPort.findAll(filters);
  }
}

@Injectable()
export class GetPendingTasksUseCase {
  private taskPort = inject(TaskPort);

  async execute(): Promise<Task[]> {
    return this.taskPort.findPending();
  }
}

@Injectable()
export class GetOverdueTasksUseCase {
  private taskPort = inject(TaskPort);

  async execute(): Promise<Task[]> {
    return this.taskPort.findOverdue();
  }
}