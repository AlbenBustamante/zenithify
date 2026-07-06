import { User } from '../../../domain/entities';
import { parseDate } from '../../../../shared/utils/date.util';

export interface ProfileRow {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  default_currency: string;
  timezone: string;
  is_premium: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseRow {
  id: string;
  user_id: string;
  amount_usd: number | null;
  amount_ves: number | null;
  exchange_rate: number;
  description: string;
  category_id: string | null;
  expense_date: string;
  payment_method: string;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomeRow {
  id: string;
  user_id: string;
  amount_usd: number | null;
  amount_ves: number | null;
  exchange_rate: number;
  description: string;
  category_id: string | null;
  income_date: string;
  income_method: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetRow {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  period: string;
  start_date: string;
  end_date: string | null;
  category_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanRow {
  id: string;
  user_id: string;
  name: string;
  provider: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  next_billing_date: string;
  category_id: string | null;
  url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookmarkRow {
  id: string;
  user_id: string;
  title: string;
  url: string;
  description: string | null;
  category_id: string | null;
  favicon_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  user_id: string | null;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  is_system: boolean;
  created_at: string;
}

export interface ExchangeRateRow {
  id: string;
  user_id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface UserQuotaRow {
  user_id: string;
  expenses_count: number;
  expenses_reset_at: string;
  incomes_count: number;
  incomes_reset_at: string;
  tasks_count: number;
  tasks_reset_at: string;
  bookmarks_count: number;
  bookmarks_reset_at: string;
  updated_at: string;
}

export class EntityMapper {
  static toUser(row: ProfileRow | null, email: string): User {
    return {
      id: '',
      email,
      displayName: row?.display_name ?? undefined,
      avatarUrl: row?.avatar_url ?? undefined,
      defaultCurrency: (row?.default_currency ?? 'USD') as 'USD' | 'VES',
      timezone: row?.timezone ?? 'America/Caracas',
      isPremium: row?.is_premium ?? false,
      createdAt: row?.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row?.updated_at ? new Date(row.updated_at) : new Date(),
    };
  }

  static toCategory(row: CategoryRow) {
    return {
      id: row.id,
      userId: row.user_id ?? undefined,
      name: row.name,
      type: row.type as 'expense' | 'income' | 'both',
      icon: row.icon ?? undefined,
      color: row.color ?? undefined,
      isSystem: row.is_system,
      createdAt: new Date(row.created_at),
    };
  }

  static toExpense(row: ExpenseRow) {
    return {
      id: row.id,
      userId: row.user_id,
      amountUsd: row.amount_usd ?? undefined,
      amountVes: row.amount_ves ?? undefined,
      exchangeRate: row.exchange_rate,
      description: row.description,
      categoryId: row.category_id ?? undefined,
      expenseDate: parseDate(row.expense_date),
      paymentMethod: row.payment_method as 'cash' | 'card' | 'divisas' | 'transferencia',
      receiptUrl: row.receipt_url ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  static toIncome(row: IncomeRow) {
    return {
      id: row.id,
      userId: row.user_id,
      amountUsd: row.amount_usd ?? undefined,
      amountVes: row.amount_ves ?? undefined,
      exchangeRate: row.exchange_rate,
      description: row.description,
      categoryId: row.category_id ?? undefined,
      incomeDate: parseDate(row.income_date),
      incomeMethod: row.income_method as 'salario' | 'remesa' | 'freelance' | 'inversiones' | 'regalo' | 'venta' | 'premio' | 'becas' | 'herencia' | 'otro',
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  static toBudget(row: BudgetRow) {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      amount: row.amount,
      currency: row.currency as 'USD' | 'VES',
      period: row.period as 'weekly' | 'monthly' | 'yearly',
      startDate: parseDate(row.start_date),
      endDate: row.end_date ? parseDate(row.end_date) : undefined,
      categoryIds: row.category_ids,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  static toPlan(row: PlanRow) {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      provider: row.provider,
      amount: row.amount,
      currency: row.currency as 'USD' | 'VES',
      billingCycle: row.billing_cycle as 'monthly' | 'yearly',
      nextBillingDate: parseDate(row.next_billing_date),
      categoryId: row.category_id ?? undefined,
      url: row.url ?? undefined,
      notes: row.notes ?? undefined,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  static toTask(row: TaskRow) {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      description: row.description ?? undefined,
      dueDate: row.due_date ? new Date(row.due_date) : undefined,
      priority: row.priority as 'low' | 'medium' | 'high',
      status: row.status as 'pending' | 'in_progress' | 'completed',
      categoryId: row.category_id ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  static toBookmark(row: BookmarkRow) {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      url: row.url,
      description: row.description ?? undefined,
      categoryId: row.category_id ?? undefined,
      faviconUrl: row.favicon_url ?? undefined,
      tags: row.tags,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  static toExchangeRate(row: ExchangeRateRow) {
    return {
      id: row.id,
      userId: row.user_id,
      fromCurrency: row.from_currency as 'USD' | 'VES',
      toCurrency: row.to_currency as 'USD' | 'VES',
      rate: row.rate,
      updatedAt: new Date(row.updated_at),
    };
  }

  static toNotification(row: NotificationRow) {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as 'task_due' | 'plan_renewal' | 'budget_alert' | 'system',
      title: row.title,
      body: row.body ?? undefined,
      data: row.data,
      isRead: row.is_read,
      createdAt: new Date(row.created_at),
    };
  }

  static toUserQuota(row: UserQuotaRow) {
    return {
      userId: row.user_id,
      expensesCount: row.expenses_count,
      expensesResetAt: parseDate(row.expenses_reset_at),
      incomesCount: row.incomes_count,
      incomesResetAt: parseDate(row.incomes_reset_at),
      tasksCount: row.tasks_count,
      tasksResetAt: parseDate(row.tasks_reset_at),
      bookmarksCount: row.bookmarks_count,
      bookmarksResetAt: parseDate(row.bookmarks_reset_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}