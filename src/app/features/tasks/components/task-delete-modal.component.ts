import { Component, ChangeDetectionStrategy, input, output, inject, computed, signal, effect } from '@angular/core';
import { ModalComponent } from '../../../shared/ui/components/modal/modal.component';
import { ButtonComponent } from '../../../shared/ui/components/button/button.component';
import { Task, TaskDeleteMode } from '../../../core/domain/entities';

@Component({
  selector: 'app-task-delete-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, ButtonComponent],
  templateUrl: './task-delete-modal.component.html',
})
export class TaskDeleteModalComponent {
  isOpen = input(false);
  task = input<Task | null>(null);
  childCount = input(0);
  isLoading = input(false);

  confirm = output<TaskDeleteMode>();
  closed = output<void>();

  readonly hasChildren = computed(() => this.childCount() > 0);
  readonly childLabel = computed(() => {
    const n = this.childCount();
    if (n === 0) return '';
    return n === 1 ? '1 subtarea' : `${n} subtareas`;
  });

  onClose(): void {
    if (this.isLoading()) return;
    this.closed.emit();
  }

  onCancel(): void {
    this.confirm.emit('cancel');
  }

  onCascade(): void {
    this.confirm.emit('cascade');
  }

  onOrphan(): void {
    this.confirm.emit('orphan');
  }
}
