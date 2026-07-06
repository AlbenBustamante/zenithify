import { Component, signal, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, CdkDrag, CdkDropList, CdkDropListGroup, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ButtonComponent } from '../../../shared/ui/components/button/button.component';
import { BadgeComponent } from '../../../shared/ui/components/badge/badge.component';
import { SkeletonComponent } from '../../../shared/ui/components/skeleton/skeleton.component';
import { Task, TaskStatus } from '../../../core/domain/entities';
import { formatShortDate, isOverdue, daysFromNow } from '../../../shared/utils';
import { SupabaseAuthAdapter } from '../../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { SupabaseTaskRepository } from '../../../core/infrastructure/supabase/adapters/supabase-task.repository';
import {
  CreateTaskUseCase,
  GetTaskByIdUseCase,
  ListTaskChildrenUseCase,
  UpdateTaskUseCase,
  DeleteTaskWithChildrenStrategyUseCase,
} from '../../../core/application/use-cases/task/task.use-cases';
import { TaskStatusDerivedService } from '../services/task-status.derived';
import { TaskFormModalComponent, TaskFormSubmitPayload } from '../components/task-form-modal.component';
import { TaskDeleteModalComponent } from '../components/task-delete-modal.component';

interface KanbanColumn {
  id: TaskStatus;
  title: string;
  emptyLabel: string;
  accent: string;
}

@Component({
  selector: 'app-tasks-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    ButtonComponent,
    BadgeComponent,
    SkeletonComponent,
    TaskFormModalComponent,
    TaskDeleteModalComponent,
  ],
  templateUrl: './tasks-board.component.html',
})
export class TasksBoardComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authAdapter = inject(SupabaseAuthAdapter);
  private taskRepo = inject(SupabaseTaskRepository);
  private getTaskUC = inject(GetTaskByIdUseCase);
  private listChildrenUC = inject(ListTaskChildrenUseCase);
  private createTaskUC = inject(CreateTaskUseCase);
  private updateTaskUC = inject(UpdateTaskUseCase);
  private deleteStrategyUC = inject(DeleteTaskWithChildrenStrategyUseCase);
  private derived = inject(TaskStatusDerivedService);

  readonly columns: readonly KanbanColumn[] = [
    { id: 'pending', title: 'Pendientes', emptyLabel: 'Sin tareas pendientes', accent: 'bg-slate-400' },
    { id: 'in_progress', title: 'En Progreso', emptyLabel: 'Nada en progreso', accent: 'bg-amber-400' },
    { id: 'completed', title: 'Completadas', emptyLabel: 'Aún no hay completadas', accent: 'bg-emerald-500' },
  ];

  readonly columnData: Record<TaskStatus, ReturnType<typeof signal<Task[]>>> = {
    pending: signal<Task[]>([]),
    in_progress: signal<Task[]>([]),
    completed: signal<Task[]>([]),
  };

  children = signal<Task[]>([]);
  parent = signal<Task | null>(null);
  childCountByParent = signal<Record<string, number>>({});
  isDataLoading = signal(true);
  isFormOpen = signal(false);
  isDeleteOpen = signal(false);
  isMutating = signal(false);
  editingTask = signal<Task | null>(null);
  deletingTask = signal<Task | null>(null);

  readonly hasAnyChild = computed(() => this.children().length > 0);
  readonly childrenCounts = computed(() => this.derived.aggregateCounts(this.children()));
  readonly parentDerivedStatus = computed(() => this.derived.deriveStatus(this.children()));
  readonly parentStatusVariant = computed(() => {
    const map: Record<TaskStatus, 'default' | 'warning' | 'success'> = {
      pending: 'default',
      in_progress: 'warning',
      completed: 'success',
    };
    return map[this.parentDerivedStatus()];
  });
  readonly parentStatusLabel = computed(() => {
    const map: Record<TaskStatus, string> = {
      pending: 'Pendiente',
      in_progress: 'En progreso',
      completed: 'Completada',
    };
    return map[this.parentDerivedStatus()];
  });
  readonly deletingChildCount = computed(() => {
    const id = this.deletingTask()?.id;
    if (!id) return 0;
    return this.childCountByParent()[id] ?? 0;
  });

  get todoList(): Task[] {
    return this.columnData.pending();
  }

  get inProgressList(): Task[] {
    return this.columnData.in_progress();
  }

  get doneList(): Task[] {
    return this.columnData.completed();
  }

  async ngOnInit(): Promise<void> {
    this.route.paramMap.subscribe(async (params) => {
      const id = params.get('id');
      if (id) {
        await this.loadBoard(id);
      }
    });
  }

  async loadBoard(parentId: string): Promise<void> {
    this.isDataLoading.set(true);
    try {
      const [parent, children] = await Promise.all([
        this.getTaskUC.execute(parentId),
        this.listChildrenUC.execute(parentId),
      ]);
      this.parent.set(parent);
      this.children.set(children);
      this.distributeTasks(children);
      await this.loadChildCounts(children);
    } finally {
      this.isDataLoading.set(false);
    }
  }

  private async loadChildCounts(tasks: Task[]): Promise<void> {
    const counts: Record<string, number> = {};
    await Promise.all(
      tasks.map(async (t) => {
        const kids = await this.listChildrenUC.execute(t.id);
        counts[t.id] = kids.length;
      }),
    );
    this.childCountByParent.set(counts);
  }

  private distributeTasks(tasks: Task[]): void {
    const buckets: Record<TaskStatus, Task[]> = { pending: [], in_progress: [], completed: [] };
    for (const task of tasks) {
      buckets[task.status]?.push(task);
    }
    this.columnData.pending.set(buckets.pending);
    this.columnData.in_progress.set(buckets.in_progress);
    this.columnData.completed.set(buckets.completed);
  }

  childCountFor(taskId: string): number {
    return this.childCountByParent()[taskId] ?? 0;
  }

  goBack(): void {
    this.router.navigate(['/tasks']);
  }

  goToDrillDown(task: Task): void {
    this.router.navigate(['/tasks', task.id]);
  }

  openCreateModal(): void {
    this.editingTask.set(null);
    this.isFormOpen.set(true);
  }

  openEditModal(task: Task): void {
    this.editingTask.set(task);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
    this.editingTask.set(null);
  }

  openDeleteModal(task: Task): void {
    this.deletingTask.set(task);
    this.isDeleteOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteOpen.set(false);
    this.deletingTask.set(null);
  }

  async onFormSubmit(payload: TaskFormSubmitPayload): Promise<void> {
    const parent = this.parent();
    if (!parent) return;
    this.isMutating.set(true);
    try {
      const editing = this.editingTask();
      if (editing) {
        await this.updateTaskUC.execute(editing.id, payload);
      } else {
        const user = await this.authAdapter.getCurrentUser();
        if (!user) return;
        await this.createTaskUC.execute({ ...payload, parentTaskId: parent.id }, user.id, false);
      }
      this.closeForm();
      await this.loadBoard(parent.id);
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      this.isMutating.set(false);
    }
  }

  async onDeleteConfirm(mode: 'cascade' | 'orphan' | 'cancel'): Promise<void> {
    if (mode === 'cancel') {
      this.closeDeleteModal();
      return;
    }
    const task = this.deletingTask();
    const parent = this.parent();
    if (!task) return;
    this.isMutating.set(true);
    try {
      const user = await this.authAdapter.getCurrentUser();
      if (!user) return;
      await this.deleteStrategyUC.execute(task.id, user.id, mode);
      this.closeDeleteModal();
      if (parent) {
        await this.loadBoard(parent.id);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      this.isMutating.set(false);
    }
  }

  drop(event: CdkDragDrop<Task[]>, targetStatus: TaskStatus): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }

    const movedTask = event.previousContainer.data[event.previousIndex];
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex,
    );

    movedTask.status = targetStatus;
    void this.updateTaskUC.execute(movedTask.id, { status: targetStatus });
  }

  formatDate(date: Date): string {
    return formatShortDate(date);
  }

  isOverdue(date: Date): boolean {
    return isOverdue(date);
  }

  daysFromNow(date: Date): number {
    return daysFromNow(date);
  }
}
