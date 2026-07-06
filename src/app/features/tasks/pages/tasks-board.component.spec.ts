import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Task, TaskStatus } from '../../../core/domain/entities';
import {
  GetTaskByIdUseCase,
  ListTaskChildrenUseCase,
  UpdateTaskUseCase,
  CreateTaskUseCase,
  DeleteTaskWithChildrenStrategyUseCase,
} from '../../../core/application/use-cases/task/task.use-cases';
import { SupabaseAuthAdapter } from '../../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { TaskStatusDerivedService } from '../services/task-status.derived';
import { TasksBoardComponent } from './tasks-board.component';

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

const buildDropEvent = (
  previous: Task[],
  current: Task[],
  previousIndex: number,
  currentIndex: number,
): CdkDragDrop<Task[]> => {
  const container = { id: 'list', data: current } as never;
  return {
    previousIndex,
    currentIndex,
    item: {} as never,
    container,
    previousContainer: previous === current ? container : ({ id: 'previous', data: previous } as never),
    isPointerOverContainer: true,
    distance: { x: 0, y: 0 },
    dropPoint: { x: 0, y: 0 },
    event: {} as never,
  } as unknown as CdkDragDrop<Task[]>;
};

describe('TasksBoardComponent', () => {
  let component: TasksBoardComponent;
  let updateSpy: ReturnType<typeof vi.fn>;
  let getTaskSpy: ReturnType<typeof vi.fn>;
  let listChildrenSpy: ReturnType<typeof vi.fn>;
  let routerNavSpy: ReturnType<typeof vi.fn>;

  const buildProviders = () => [
    { provide: SupabaseAuthAdapter, useValue: { getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }) } },
    { provide: GetTaskByIdUseCase, useValue: { execute: getTaskSpy } },
    { provide: ListTaskChildrenUseCase, useValue: { execute: listChildrenSpy } },
    { provide: CreateTaskUseCase, useValue: { execute: vi.fn().mockResolvedValue({}) } },
    { provide: UpdateTaskUseCase, useValue: { execute: updateSpy } },
    { provide: DeleteTaskWithChildrenStrategyUseCase, useValue: { execute: vi.fn() } },
    { provide: TaskStatusDerivedService, useClass: TaskStatusDerivedService },
  ];

  beforeEach(async () => {
    updateSpy = vi.fn().mockResolvedValue(undefined);
    getTaskSpy = vi.fn().mockResolvedValue(buildTask('parent', 'in_progress'));
    listChildrenSpy = vi.fn().mockResolvedValue([]);
    routerNavSpy = vi.fn();

    await TestBed.configureTestingModule({
      providers: [
        ...buildProviders(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: { subscribe: (cb: (p: ReturnType<typeof convertToParamMap>) => void) => cb(convertToParamMap({ id: 'parent' })) } },
        },
        { provide: Router, useValue: { navigate: routerNavSpy } },
      ],
    }).compileComponents();
  });

  async function createComponent(): Promise<void> {
    const fixture = TestBed.createComponent(TasksBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    updateSpy.mockClear();
  }

  it('moves a task between columns and syncs the new status to the backend', async () => {
    listChildrenSpy.mockResolvedValueOnce([buildTask('a', 'pending')]);
    await createComponent();

    const event = buildDropEvent(component.todoList, component.doneList, 0, 0);
    component.drop(event, 'completed');

    expect(component.todoList).toEqual([]);
    expect(component.doneList[0].id).toBe('a');
    expect(component.doneList[0].status).toBe('completed');
    expect(updateSpy).toHaveBeenCalledWith('a', { status: 'completed' });
  });

  it('reorders within the same column without calling the backend', async () => {
    listChildrenSpy.mockResolvedValueOnce([
      buildTask('a', 'pending'),
      buildTask('b', 'pending'),
      buildTask('c', 'pending'),
    ]);
    await createComponent();

    const event = buildDropEvent(component.todoList, component.todoList, 0, 2);
    component.drop(event, 'pending');

    expect(component.todoList.map((t) => t.id)).toEqual(['b', 'c', 'a']);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('derives parent status from children counts', async () => {
    listChildrenSpy.mockResolvedValueOnce([
      buildTask('a', 'completed'),
      buildTask('b', 'completed'),
    ]);
    await createComponent();

    expect(component.parentDerivedStatus()).toBe<TaskStatus>('completed');
    expect(component.childrenCounts()).toEqual({ pending: 0, in_progress: 0, completed: 2 });
  });

  it('navigates back to /tasks when goBack is called', async () => {
    await createComponent();
    component.goBack();
    expect(routerNavSpy).toHaveBeenCalledWith(['/tasks']);
  });

  it('navigates to drill-down when goToDrillDown is called', async () => {
    await createComponent();
    component.goToDrillDown(buildTask('child', 'pending'));
    expect(routerNavSpy).toHaveBeenCalledWith(['/tasks', 'child']);
  });
});
