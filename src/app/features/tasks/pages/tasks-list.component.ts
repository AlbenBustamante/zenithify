import { Component, signal, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CardComponent } from '../../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../../shared/ui/components/button/button.component';
import { BadgeComponent } from '../../../shared/ui/components/badge/badge.component';
import { SkeletonComponent } from '../../../shared/ui/components/skeleton/skeleton.component';
import { Task, TaskDeleteMode, TaskStatus } from '../../../core/domain/entities';
import { formatShortDate, isOverdue } from '../../../shared/utils';
import { SupabaseAuthAdapter } from '../../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { SupabaseTaskRepository } from '../../../core/infrastructure/supabase/adapters/supabase-task.repository';
import {
  CreateTaskUseCase,
  UpdateTaskUseCase,
  ListTopLevelTasksUseCase,
  ListTaskChildrenUseCase,
  DeleteTaskWithChildrenStrategyUseCase,
} from '../../../core/application/use-cases/task/task.use-cases';
import { TaskStatusDerivedService } from '../services/task-status.derived';
import { TaskFormModalComponent, TaskFormSubmitPayload } from '../components/task-form-modal.component';
import { TaskDeleteModalComponent } from '../components/task-delete-modal.component';

interface GeneralWithCounts {
  task: Task;
  derivedStatus: TaskStatus;
  counts: { pending: number; in_progress: number; completed: number };
}

@Component({
  selector: 'app-tasks-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CardComponent,
    ButtonComponent,
    BadgeComponent,
    SkeletonComponent,
    TaskFormModalComponent,
    TaskDeleteModalComponent,
  ],
  templateUrl: './tasks-list.component.html',
})
export class TasksListComponent implements OnInit {
  private router = inject(Router);
  private authAdapter = inject(SupabaseAuthAdapter);
  private taskRepo = inject(SupabaseTaskRepository);
  private createTaskUC = inject(CreateTaskUseCase);
  private updateTaskUC = inject(UpdateTaskUseCase);
  private listTopLevelUC = inject(ListTopLevelTasksUseCase);
  private listChildrenUC = inject(ListTaskChildrenUseCase);
  private deleteStrategyUC = inject(DeleteTaskWithChildrenStrategyUseCase);
  private derived = inject(TaskStatusDerivedService);

  generals = signal<GeneralWithCounts[]>([]);
  isDataLoading = signal(true);
  isFormOpen = signal(false);
  isDeleteOpen = signal(false);
  isMutating = signal(false);
  editingTask = signal<Task | null>(null);
  deletingTask = signal<Task | null>(null);
  deletingChildCount = signal(0);

  readonly hasAnyGeneral = computed(() => this.generals().length > 0);

  readonly sortedGenerals = computed(() => {
    const statusRank: Record<TaskStatus, number> = { in_progress: 0, pending: 1, completed: 2 };
    return [...this.generals()].sort((a, b) => {
      const rank = statusRank[a.derivedStatus] - statusRank[b.derivedStatus];
      if (rank !== 0) return rank;
      return b.task.createdAt.getTime() - a.task.createdAt.getTime();
    });
  });

  async ngOnInit(): Promise<void> {
    await this.loadGenerals();
  }

  async loadGenerals(): Promise<void> {
    this.isDataLoading.set(true);
    try {
      const topLevel = await this.listTopLevelUC.execute();
      const enriched = await Promise.all(
        topLevel.map(async (task) => {
          const children = await this.listChildrenUC.execute(task.id);
          return {
            task,
            derivedStatus: this.derived.deriveStatus(children),
            counts: this.derived.aggregateCounts(children),
          } satisfies GeneralWithCounts;
        }),
      );
      this.generals.set(enriched);
    } finally {
      this.isDataLoading.set(false);
    }
  }

  openCreateModal(): void {
    this.editingTask.set(null);
    this.isFormOpen.set(true);
  }

  openEditModal(task: Task, event: Event): void {
    event.stopPropagation();
    this.editingTask.set(task);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingTask.set(null);
  }

  openBoard(task: Task): void {
    this.router.navigate(['/tasks', task.id]);
  }

  async openDeleteModal(task: Task, event: Event): Promise<void> {
    event.stopPropagation();
    this.isMutating.set(true);
    try {
      const children = await this.listChildrenUC.execute(task.id);
      this.deletingChildCount.set(children.length);
      this.deletingTask.set(task);
      this.isDeleteOpen.set(true);
    } finally {
      this.isMutating.set(false);
    }
  }

  closeDeleteModal(): void {
    this.isDeleteOpen.set(false);
    this.deletingTask.set(null);
    this.deletingChildCount.set(0);
  }

  async onFormSubmit(payload: TaskFormSubmitPayload): Promise<void> {
    this.isMutating.set(true);
    try {
      const editing = this.editingTask();
      if (editing) {
        await this.updateTaskUC.execute(editing.id, payload);
      } else {
        const user = await this.authAdapter.getCurrentUser();
        if (!user) return;
        await this.createTaskUC.execute(payload, user.id, false);
      }
      this.closeForm();
      await this.loadGenerals();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      this.isMutating.set(false);
    }
  }

  async onDeleteConfirm(mode: TaskDeleteMode): Promise<void> {
    if (mode === 'cancel') {
      this.closeDeleteModal();
      return;
    }
    const task = this.deletingTask();
    if (!task) return;
    this.isMutating.set(true);
    try {
      const user = await this.authAdapter.getCurrentUser();
      if (!user) return;
      await this.deleteStrategyUC.execute(task.id, user.id, mode);
      this.closeDeleteModal();
      await this.loadGenerals();
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      this.isMutating.set(false);
    }
  }

  formatDate(date: Date): string {
    return formatShortDate(date);
  }

  isOverdue(date: Date): boolean {
    return isOverdue(date);
  }

  statusVariant(status: TaskStatus): 'default' | 'warning' | 'success' {
    const map: Record<TaskStatus, 'default' | 'warning' | 'success'> = {
      pending: 'default',
      in_progress: 'warning',
      completed: 'success',
    };
    return map[status];
  }

  statusLabel(status: TaskStatus): string {
    const map: Record<TaskStatus, string> = {
      pending: 'Pendiente',
      in_progress: 'En progreso',
      completed: 'Completada',
    };
    return map[status];
  }
}
