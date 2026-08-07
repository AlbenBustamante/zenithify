import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app.routes';

import { SupabaseAuthAdapter } from './core/infrastructure/supabase/adapters/supabase-auth.adapter';
import { SupabaseExpenseRepository } from './core/infrastructure/supabase/adapters/supabase-expense.repository';
import { SupabaseIncomeRepository } from './core/infrastructure/supabase/adapters/supabase-income.repository';
import { SupabaseBudgetRepository } from './core/infrastructure/supabase/adapters/supabase-budget.repository';
import { SupabasePlanRepository } from './core/infrastructure/supabase/adapters/supabase-plan.repository';
import { SupabaseTaskRepository } from './core/infrastructure/supabase/adapters/supabase-task.repository';
import { SupabaseBookmarkRepository } from './core/infrastructure/supabase/adapters/supabase-bookmark.repository';
import { SupabaseCategoryRepository } from './core/infrastructure/supabase/adapters/supabase-category.repository';
import { SupabaseQuotaRepository } from './core/infrastructure/supabase/adapters/supabase-quota.repository';
import { SupabaseExchangeRateRepository } from './core/infrastructure/supabase/adapters/supabase-exchange-rate.repository';
import { SupabaseNotificationAdapter } from './core/infrastructure/supabase/adapters/supabase-notification.adapter';

import {
  AUTH_PORT,
  EXPENSE_PORT,
  INCOME_PORT,
  BUDGET_PORT,
  PLAN_PORT,
  TASK_PORT,
  BOOKMARK_PORT,
  CATEGORY_PORT,
  EXPENSE_REPOSITORY_PORT,
  INCOME_REPOSITORY_PORT,
  BUDGET_REPOSITORY_PORT,
  PLAN_REPOSITORY_PORT,
  TASK_REPOSITORY_PORT,
  BOOKMARK_REPOSITORY_PORT,
  CATEGORY_REPOSITORY_PORT,
  QUOTA_REPOSITORY_PORT,
  EXCHANGE_RATE_REPOSITORY_PORT,
  NOTIFICATION_PORT,
} from './core/application/ports/ports.tokens';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptorsFromDi()),

    SupabaseAuthAdapter,
    SupabaseExpenseRepository,
    SupabaseIncomeRepository,
    SupabaseBudgetRepository,
    SupabasePlanRepository,
    SupabaseTaskRepository,
    SupabaseBookmarkRepository,
    SupabaseCategoryRepository,
    SupabaseQuotaRepository,
    SupabaseExchangeRateRepository,
    SupabaseNotificationAdapter,

    { provide: AUTH_PORT, useExisting: SupabaseAuthAdapter },
    { provide: EXPENSE_PORT, useExisting: SupabaseExpenseRepository },
    { provide: INCOME_PORT, useExisting: SupabaseIncomeRepository },
    { provide: BUDGET_PORT, useExisting: SupabaseBudgetRepository },
    { provide: PLAN_PORT, useExisting: SupabasePlanRepository },
    { provide: TASK_PORT, useExisting: SupabaseTaskRepository },
    { provide: BOOKMARK_PORT, useExisting: SupabaseBookmarkRepository },
    { provide: CATEGORY_PORT, useExisting: SupabaseCategoryRepository },

    { provide: EXPENSE_REPOSITORY_PORT, useExisting: SupabaseExpenseRepository },
    { provide: INCOME_REPOSITORY_PORT, useExisting: SupabaseIncomeRepository },
    { provide: BUDGET_REPOSITORY_PORT, useExisting: SupabaseBudgetRepository },
    { provide: PLAN_REPOSITORY_PORT, useExisting: SupabasePlanRepository },
    { provide: TASK_REPOSITORY_PORT, useExisting: SupabaseTaskRepository },
    { provide: BOOKMARK_REPOSITORY_PORT, useExisting: SupabaseBookmarkRepository },
    { provide: CATEGORY_REPOSITORY_PORT, useExisting: SupabaseCategoryRepository },
    { provide: QUOTA_REPOSITORY_PORT, useExisting: SupabaseQuotaRepository },
    { provide: EXCHANGE_RATE_REPOSITORY_PORT, useExisting: SupabaseExchangeRateRepository },
    { provide: NOTIFICATION_PORT, useExisting: SupabaseNotificationAdapter },
  ],
};
