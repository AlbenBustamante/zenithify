import { Component, ChangeDetectionStrategy, input, output, inject, OnInit, effect, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalComponent } from '../../../shared/ui/components/modal/modal.component';
import { InputComponent } from '../../../shared/ui/components/input/input.component';
import { SelectComponent } from '../../../shared/ui/components/select/select.component';
import { ButtonComponent } from '../../../shared/ui/components/button/button.component';
import { Task, TaskPriority } from '../../../core/domain/entities';
import { toISOStringDate, parseDate } from '../../../shared/utils';

export interface TaskFormSubmitPayload {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: Date;
}

@Component({
  selector: 'app-task-form-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, ModalComponent, InputComponent, SelectComponent, ButtonComponent],
  templateUrl: './task-form-modal.component.html',
})
export class TaskFormModalComponent implements OnInit {
  isOpen = input(false);
  editingTask = input<Task | null>(null);
  parentContextTitle = input<string | null>(null);
  isLoading = input(false);

  submitForm = output<TaskFormSubmitPayload>();
  closed = output<void>();

  private fb = inject(FormBuilder);

  form = this.fb.group({
    title: ['', [Validators.required]],
    description: [''],
    priority: ['medium' as TaskPriority],
    dueDate: [''],
  });

  readonly modalTitle = computed(() => (this.editingTask() ? 'Editar Tarea' : 'Nueva Tarea'));

  constructor() {
    effect(() => {
      const task = this.editingTask();
      const isOpen = this.isOpen();
      if (isOpen) {
        if (task) {
          this.form.patchValue({
            title: task.title,
            description: task.description ?? '',
            priority: task.priority,
            dueDate: task.dueDate ? toISOStringDate(task.dueDate) : '',
          });
        } else {
          this.form.reset({ priority: 'medium' });
        }
      }
    });
  }

  ngOnInit(): void {}

  onSubmit(): void {
    if (this.form.invalid) return;
    const value = this.form.value;
    this.submitForm.emit({
      title: value.title!,
      description: value.description || undefined,
      priority: value.priority as TaskPriority,
      dueDate: value.dueDate ? parseDate(value.dueDate) : undefined,
    });
  }

  onClose(): void {
    this.closed.emit();
  }
}
