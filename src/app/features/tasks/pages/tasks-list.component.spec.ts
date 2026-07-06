import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Task, TaskStatus } from '../../../core/domain/entities';
import {
  CreateTaskUseCase,
  UpdateTaskUseCase,
  ListTopLevelTasksUseCase,
  ListTaskChildrenUseCase,
  DeleteTaskWithChildrenStrategyUseCase,
} from '../../../core/application/use-cases/task/task.use-cases';
import { SupabaseAuthAdapter } from '../../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { SupabaseTaskRepository } from '../../../core/infrastructure/supabase/adapters/supabase-task.repository';
import { TaskStatusDerivedService } from '../services/task-status.derived';
import { TasksListComponent } from './tasks-list.component';

const buildTask = (id: string, status: TaskStatus, parentId?: string): Task => ({
  id,
  userId: 'u1',
  title: `Task ${id}`,
  priority: 'medium',
  status,
  parentTaskId: parentId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('TasksListComponent', () => {
  let component: TasksListComponent;
  let listTopLevelSpy: ReturnType<typeof vi.fn>;
  let listChildrenSpy: ReturnType<typeof vi.fn>;
  let routerNavSpy: ReturnType<typeof vi.fn>;
  let deleteStrategySpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    listTopLevelSpy = vi.fn();
    listChildrenSpy = vi.fn().mockResolvedValue([]);
    routerNavSpy = vi.fn();
    deleteStrategySpy = vi.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      providers: [
        TasksListComponent,
        { provide: Router, useValue: { navigate: routerNavSpy } },
        { provide: SupabaseAuthAdapter, useValue: { getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }) } },
        { provide: SupabaseTaskRepository, useValue: {} },
        { provide: CreateTaskUseCase, useValue: { execute: vi.fn() } },
        { provide: UpdateTaskUseCase, useValue: { execute: vi.fn() } },
        { provide: ListTopLevelTasksUseCase, useValue: { execute: listTopLevelSpy } },
        { provide: ListTaskChildrenUseCase, useValue: { execute: listChildrenSpy } },
        { provide: DeleteTaskWithChildrenStrategyUseCase, useValue: { execute: deleteStrategySpy } },
        { provide: TaskStatusDerivedService, useClass: TaskStatusDerivedService },
      ],
    }).compileComponents();
  });

  async function init(): Promise<void> {
    const fixture = TestBed.createComponent(TasksListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  }

  it('loads top-level generals with derived counts', async () => {
    const general = buildTask('g1', 'pending');
    listTopLevelSpy.mockResolvedValueOnce([general]);
    listChildrenSpy.mockResolvedValueOnce([buildTask('c1', 'completed', 'g1'), buildTask('c2', 'in_progress', 'g1')]);

    await init();

    expect(component.generals().length).toBe(1);
    expect(component.generals()[0].counts).toEqual({ pending: 0, in_progress: 1, completed: 1 });
    expect(component.generals()[0].derivedStatus).toBe<TaskStatus>('in_progress');
  });

  it('sorts generals: in_progress first, then pending, then completed', async () => {
    const now = Date.now();
    const g1 = { ...buildTask('g1', 'pending'), createdAt: new Date(now - 1000) };
    const g2 = { ...buildTask('g2', 'in_progress'), createdAt: new Date(now - 2000) };
    const g3 = { ...buildTask('g3', 'completed'), createdAt: new Date(now - 3000) };
    listTopLevelSpy.mockResolvedValueOnce([g1, g2, g3]);
    listChildrenSpy.mockImplementation(async (parentId: string) => {
      if (parentId === 'g1') return [buildTask('c1', 'pending', 'g1')];
      if (parentId === 'g2') return [buildTask('c2', 'in_progress', 'g2')];
      if (parentId === 'g3') return [buildTask('c3', 'completed', 'g3')];
      return [];
    });

    await init();

    const ids = component.sortedGenerals().map((g) => g.task.id);
    expect(ids).toEqual(['g2', 'g1', 'g3']);
  });

  it('navigates to /tasks/:id when openBoard is called', async () => {
    listTopLevelSpy.mockResolvedValueOnce([]);
    await init();

    component.openBoard(buildTask('g1', 'pending'));
    expect(routerNavSpy).toHaveBeenCalledWith(['/tasks', 'g1']);
  });

  it('calls delete strategy with cascade mode', async () => {
    listTopLevelSpy.mockResolvedValueOnce([]);
    await init();

    component.deletingTask.set(buildTask('g1', 'pending'));
    await component.onDeleteConfirm('cascade');
    expect(deleteStrategySpy).toHaveBeenCalledWith('g1', 'u1', 'cascade');
  });

  it('calls delete strategy with orphan mode', async () => {
    listTopLevelSpy.mockResolvedValueOnce([]);
    await init();

    component.deletingTask.set(buildTask('g1', 'pending'));
    await component.onDeleteConfirm('orphan');
    expect(deleteStrategySpy).toHaveBeenCalledWith('g1', 'u1', 'orphan');
  });

  it('does not call delete strategy on cancel', async () => {
    listTopLevelSpy.mockResolvedValueOnce([]);
    await init();

    component.deletingTask.set(buildTask('g1', 'pending'));
    await component.onDeleteConfirm('cancel');
    expect(deleteStrategySpy).not.toHaveBeenCalled();
  });
});
