export type Currency = 'USD' | 'VES';

export type BillingCycle = 'monthly' | 'yearly';
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type NotificationType = 'task_due' | 'plan_renewal' | 'budget_alert' | 'system';
export type CategoryType = 'expense' | 'income' | 'both';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  defaultCurrency?: Currency;
  timezone?: string;
  isPremium?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Category {
  id: string;
  userId?: string;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  isSystem: boolean;
  createdAt: Date;
}

export interface Expense {
  id: string;
  userId: string;
  amount: number;
  currency: Currency;
  description: string;
  categoryId?: string;
  category?: Category;
  expenseDate: Date;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Income {
  id: string;
  userId: string;
  amount: number;
  currency: Currency;
  description: string;
  categoryId?: string;
  category?: Category;
  incomeDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: Currency;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;
  categoryIds: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: string;
  userId: string;
  name: string;
  provider: string;
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  nextBillingDate: Date;
  categoryId?: string;
  category?: Category;
  url?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority: TaskPriority;
  status: TaskStatus;
  categoryId?: string;
  category?: Category;
  createdAt: Date;
  updatedAt: Date;
}

export interface Bookmark {
  id: string;
  userId: string;
  title: string;
  url: string;
  description?: string;
  categoryId?: string;
  category?: Category;
  faviconUrl?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExchangeRate {
  id: string;
  userId: string;
  fromCurrency: Currency;
  toCurrency: Currency;
  rate: number;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

export interface UserQuota {
  userId: string;
  expensesCount: number;
  expensesResetAt: Date;
  incomesCount: number;
  incomesResetAt: Date;
  tasksCount: number;
  tasksResetAt: Date;
  bookmarksCount: number;
  bookmarksResetAt: Date;
  updatedAt: Date;
}