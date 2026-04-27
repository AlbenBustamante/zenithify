import { BillingCycle } from '../entities';

export class SubscriptionCycle {
  constructor(
    public readonly cycle: BillingCycle,
    public readonly startDate: Date,
    public readonly nextBillingDate: Date
  ) {
    if (nextBillingDate <= startDate) {
      throw new Error('Next billing date must be after start date');
    }
  }

  get daysUntilRenewal(): number {
    const now = new Date();
    const diff = this.nextBillingDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get isRenewalSoon(): boolean {
    return this.daysUntilRenewal <= 7;
  }

  get isOverdue(): boolean {
    return this.nextBillingDate < new Date();
  }

  calculateNextBillingDate(fromDate: Date = new Date()): Date {
    const next = new Date(fromDate);
    if (this.cycle === 'monthly') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setFullYear(next.getFullYear() + 1);
    }
    return next;
  }

  getMonthlyAmount(amount: number): number {
    if (this.cycle === 'yearly') {
      return amount / 12;
    }
    return amount;
  }

  getYearlyAmount(amount: number): number {
    if (this.cycle === 'monthly') {
      return amount * 12;
    }
    return amount;
  }
}