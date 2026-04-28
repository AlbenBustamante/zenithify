const resourceKeyMap = {
  expense: 'expenses',
  income: 'incomes',
  task: 'tasks',
  bookmark: 'bookmarks',
} as const;

export interface QuotaLimits {
  expenses: number;
  incomes: number;
  tasks: number;
  bookmarks: number;
}

export interface QuotaStatus {
  resource: 'expense' | 'income' | 'task' | 'bookmark';
  currentCount: number;
  limit: number;
  isPremium: boolean;
  resetAt: Date;
  remaining: number;
  isExceeded: boolean;
}

export class QuotaStatusVO {
  constructor(
    public readonly resource: 'expense' | 'income' | 'task' | 'bookmark',
    public readonly currentCount: number,
    public readonly limit: number,
    public readonly isPremium: boolean,
    public readonly resetAt: Date
  ) {}

  get remaining(): number {
    if (this.isPremium) return Infinity;
    return Math.max(0, this.limit - this.currentCount);
  }

  get isExceeded(): boolean {
    if (this.isPremium) return false;
    return this.currentCount >= this.limit;
  }

  get isWarning(): boolean {
    if (this.isPremium) return false;
    const threshold = 0.8;
    return this.currentCount >= this.limit * threshold;
  }
}

export const FREEMIUM_LIMITS: QuotaLimits = {
  expenses: 15,
  incomes: 15,
  tasks: 30,
  bookmarks: 10,
};