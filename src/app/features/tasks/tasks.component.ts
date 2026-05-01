import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CardComponent } from '../../shared/ui/components/card/card.component';
import { ButtonComponent } from '../../shared/ui/components/button/button.component';
import { InputComponent } from '../../shared/ui/components/input/input.component';
import { ModalComponent } from '../../shared/ui/components/modal/modal.component';
import { SelectComponent } from '../../shared/ui/components/select/select.component';
import { BadgeComponent } from '../../shared/ui/components/badge/badge.component';
import { Task, TaskPriority, TaskStatus } from '../../core/domain/entities';
import { formatShortDate, isOverdue, daysFromNow } from '../../shared/utils';
import { SupabaseTaskRepository } from '../../core/infrastructure/supabase/adapters/supabase-task.repository';
import { SupabaseAuthAdapter } from '../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { CreateTaskUseCase, UpdateTaskUseCase, DeleteTaskUseCase, CompleteTaskUseCase, ListTasksUseCase } from '../../core/application/use-cases/task/task.use-cases';

@Component({
  selector: 'app-tasks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TitleCasePipe, ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, BadgeComponent],
  templateUrl: './tasks.component.html',
})
export class TasksComponent implements OnInit {
  private fb = inject(FormBuilder);
  private taskRepo = inject(SupabaseTaskRepository);
  private createTaskUC = inject(CreateTaskUseCase);
  private updateTaskUC = inject(UpdateTaskUseCase);
  private deleteTaskUC = inject(DeleteTaskUseCase);
  private completeTaskUC = inject(CompleteTaskUseCase);
  private listTasksUC = inject(ListTasksUseCase);
  private authAdapter = inject(SupabaseAuthAdapter);

  form = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    priority: ['medium' as TaskPriority],
    dueDate: [''],
  });

  statusFilters = [
    { label: 'Todas', value: '' as TaskStatus | '' },
    { label: 'Pendientes', value: 'pending' as TaskStatus },
    { label: 'En Progreso', value: 'in_progress' as TaskStatus },
    { label: 'Completadas', value: 'completed' as TaskStatus },
  ];

  tasks = signal<Task[]>([]);
  statusFilter = signal<TaskStatus | ''>('');
  isModalOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isLoading = signal(false);
  editingTask = signal<Task | null>(null);
  deletingTask = signal<Task | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadTasks();
  }

  async loadTasks(): Promise<void> {
    const filter = this.statusFilter() ? { status: this.statusFilter() as TaskStatus } : undefined;
    const tasks = await this.taskRepo.findAll(filter);
    this.tasks.set(tasks);
  }

  setStatusFilter(status: TaskStatus | ''): void {
    this.statusFilter.set(status);
    this.loadTasks();
  }

  async toggleComplete(task: Task): Promise<void> {
    if (task.status === 'completed') {
      await this.updateTaskUC.execute(task.id, { status: 'pending' });
    } else {
      await this.completeTaskUC.execute(task.id);
    }
    await this.loadTasks();
  }

  openCreateModal(): void {
    this.editingTask.set(null);
    this.form.reset({ priority: 'medium' });
    this.isModalOpen.set(true);
  }

  openEditModal(task: Task): void {
    this.editingTask.set(task);
    this.form.patchValue({
      title: task.title,
      description: task.description ?? '',
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    });
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.editingTask.set(null);
  }

  confirmDelete(task: Task): void {
    this.deletingTask.set(task);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.deletingTask.set(null);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.isLoading.set(true);
    try {
      const currentUser = await this.authAdapter.getCurrentUser();
      if (!currentUser) {
        console.error('No user logged in');
        return;
      }
      const dto = {
        title: this.form.value.title!,
        description: this.form.value.description || undefined,
        priority: this.form.value.priority as TaskPriority,
        dueDate: this.form.value.dueDate ? new Date(this.form.value.dueDate) : undefined,
      };
      if (this.editingTask()) {
        await this.updateTaskUC.execute(this.editingTask()!.id, dto);
      } else {
        await this.createTaskUC.execute(dto, currentUser.id, false);
      }
      this.closeModal();
      await this.loadTasks();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onDelete(): Promise<void> {
    if (!this.deletingTask()) return;
    this.isLoading.set(true);
    try {
      const currentUser = await this.authAdapter.getCurrentUser();
      if (!currentUser) {
        console.error('No user logged in');
        return;
      }
      await this.deleteTaskUC.execute(this.deletingTask()!.id, currentUser.id);
      this.closeDeleteModal();
      await this.loadTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      this.isLoading.set(false);
    }
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

  getPriorityVariant(priority: TaskPriority): 'default' | 'warning' | 'danger' {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      default: return 'default';
    }
  }
}