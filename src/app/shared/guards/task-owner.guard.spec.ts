import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, convertToParamMap } from '@angular/router';
import { SupabaseAuthAdapter } from '../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { GetTaskByIdUseCase } from '../../core/application/use-cases/task/task.use-cases';
import { taskOwnerGuard } from './task-owner.guard';
import { Task } from '../../core/domain/entities';

const buildTask = (id: string, userId: string): Task => ({
  id,
  userId,
  title: id,
  priority: 'medium',
  status: 'pending',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const buildSnapshot = (id: string | null): ActivatedRouteSnapshot => {
  const params = id === null ? {} : { id };
  return { paramMap: convertToParamMap(params) } as unknown as ActivatedRouteSnapshot;
};

describe('taskOwnerGuard', () => {
  let navigateSpy: ReturnType<typeof vi.fn>;
  let getCurrentUser: ReturnType<typeof vi.fn>;
  let getTask: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateSpy = vi.fn().mockResolvedValue(true);
    getCurrentUser = vi.fn();
    getTask = vi.fn();
  });

  async function run(snapshot: ActivatedRouteSnapshot): Promise<boolean> {
    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseAuthAdapter, useValue: { getCurrentUser } },
        { provide: GetTaskByIdUseCase, useValue: { execute: getTask } },
        { provide: Router, useValue: { navigate: navigateSpy } },
      ],
    });
    const result = await TestBed.runInInjectionContext(() =>
      taskOwnerGuard(snapshot, {} as never),
    );
    return result as boolean;
  }

  it('redirects to login if user is not authenticated', async () => {
    getCurrentUser.mockResolvedValue(null);
    const result = await run(buildSnapshot('some-id'));
    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });

  it('redirects to /tasks if route has no :id', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u1' });
    const result = await run(buildSnapshot(null));
    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/tasks']);
  });

  it('redirects to /tasks if task does not exist', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u1' });
    getTask.mockResolvedValue(null);
    const result = await run(buildSnapshot('missing'));
    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/tasks']);
  });

  it('redirects to /tasks if task belongs to another user', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u1' });
    getTask.mockResolvedValue(buildTask('task-1', 'someone-else'));
    const result = await run(buildSnapshot('task-1'));
    expect(result).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/tasks']);
  });

  it('allows access if user owns the task', async () => {
    getCurrentUser.mockResolvedValue({ id: 'u1' });
    getTask.mockResolvedValue(buildTask('task-1', 'u1'));
    const result = await run(buildSnapshot('task-1'));
    expect(result).toBe(true);
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
