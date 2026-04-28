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
import { CreateTaskUseCase, UpdateTaskUseCase, DeleteTaskUseCase, CompleteTaskUseCase, ListTasksUseCase } from '../../core/application/use-cases/task/task.use-cases';

@Component({
  selector: 'app-tasks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TitleCasePipe, ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, ModalComponent, SelectComponent, BadgeComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Tareas</h1>
          <p class="text-sm text-gray-500 mt-1">Organiza tu trabajo pendientes</p>
        </div>
        <app-button (clicked)="openCreateModal()">
          <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Tarea
        </app-button>
      </div>

      <div class="flex gap-2 flex-wrap">
        @for (filter of statusFilters; track filter.value) {
          <button
            (click)="setStatusFilter(filter.value)"
            class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            [class]="statusFilter() === filter.value
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'"
          >
            {{ filter.label }}
          </button>
        }
      </div>

      <app-card [noPadding]="true">
        @if (tasks().length === 0) {
          <div class="p-12 text-center">
            <div class="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg class="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p class="text-gray-500 text-sm mb-4">No hay tareas</p>
            <app-button variant="secondary" (clicked)="openCreateModal()">Crear tu primera tarea</app-button>
          </div>
        } @else {
          <div class="divide-y divide-gray-100">
            @for (task of tasks(); track task.id) {
              <div class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <button
                  (click)="toggleComplete(task)"
                  class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                  [class]="task.status === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-300 hover:border-primary-500'"
                >
                  @if (task.status === 'completed') {
                    <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  }
                </button>
                <div class="flex-1 min-w-0">
                  <p class="font-medium truncate"
                     [class]="task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'">
                    {{ task.title }}
                  </p>
                  @if (task.dueDate) {
                    <p class="text-xs mt-0.5" [class]="isOverdue(task.dueDate) ? 'text-red-500' : 'text-gray-500'">
                      {{ formatDate(task.dueDate) }}
                      @if (!isOverdue(task.dueDate)) {
                        <span>({{ daysFromNow(task.dueDate) }} días)</span>
                      }
                    </p>
                  }
                </div>
                <app-badge [variant]="getPriorityVariant(task.priority)">
                  {{ task.priority | titlecase }}
                </app-badge>
                <app-button variant="ghost" size="sm" (clicked)="openEditModal(task)">Editar</app-button>
                <app-button variant="ghost" size="sm" (clicked)="confirmDelete(task)">Eliminar</app-button>
              </div>
            }
          </div>
        }
      </app-card>
    </div>

    <app-modal [isOpen]="isModalOpen()" [title]="editingTask() ? 'Editar Tarea' : 'Nueva Tarea'" (close)="closeModal()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
        <app-input formControlName="title" label="Título" placeholder="¿Qué necesitas hacer?"
          [error]="form.controls['title'].invalid && form.controls['title'].touched ? 'Título requerido' : ''" />

        <app-input formControlName="description" label="Descripción" placeholder="Detalles adicionales..." />

        <div class="grid grid-cols-2 gap-4">
          <app-select formControlName="priority" label="Prioridad">
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </app-select>
          <app-input formControlName="dueDate" label="Fecha de vencimiento" type="date" />
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <app-button variant="secondary" type="button" (clicked)="closeModal()">Cancelar</app-button>
          <app-button type="submit" [loading]="isLoading()" [disabled]="form.invalid">
            {{ editingTask() ? 'Actualizar' : 'Guardar' }}
          </app-button>
        </div>
      </form>
    </app-modal>

    <app-modal [isOpen]="isDeleteModalOpen()" title="Eliminar Tarea" (close)="closeDeleteModal()">
      <p class="text-gray-600">¿Estás seguro de que deseas eliminar esta tarea?</p>
      <div class="flex justify-end gap-3 mt-6">
        <app-button variant="secondary" (clicked)="closeDeleteModal()">Cancelar</app-button>
        <app-button variant="danger" (clicked)="onDelete()" [loading]="isLoading()">Eliminar</app-button>
      </div>
    </app-modal>
  `,
})
export class TasksComponent implements OnInit {
  private fb = inject(FormBuilder);
  private taskRepo = inject(SupabaseTaskRepository);
  private createTaskUC = inject(CreateTaskUseCase);
  private updateTaskUC = inject(UpdateTaskUseCase);
  private deleteTaskUC = inject(DeleteTaskUseCase);
  private completeTaskUC = inject(CompleteTaskUseCase);
  private listTasksUC = inject(ListTasksUseCase);

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
      const dto = {
        title: this.form.value.title!,
        description: this.form.value.description || undefined,
        priority: this.form.value.priority as TaskPriority,
        dueDate: this.form.value.dueDate ? new Date(this.form.value.dueDate) : undefined,
      };
      if (this.editingTask()) {
        await this.updateTaskUC.execute(this.editingTask()!.id, dto);
      } else {
        await this.createTaskUC.execute(dto, '', false);
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
      await this.deleteTaskUC.execute(this.deletingTask()!.id, '');
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
