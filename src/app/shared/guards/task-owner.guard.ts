import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseAuthAdapter } from '../../core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { GetTaskByIdUseCase } from '../../core/application/use-cases/task/task.use-cases';

export const taskOwnerGuard: CanActivateFn = async (route) => {
  const authService = inject(SupabaseAuthAdapter);
  const getTaskUC = inject(GetTaskByIdUseCase);
  const router = inject(Router);

  const user = await authService.getCurrentUser();
  if (!user) {
    router.navigate(['/auth/login']);
    return false;
  }

  const taskId = route.paramMap.get('id');
  if (!taskId) {
    router.navigate(['/tasks']);
    return false;
  }

  const task = await getTaskUC.execute(taskId);
  if (!task || task.userId !== user.id) {
    router.navigate(['/tasks']);
    return false;
  }

  return true;
};
