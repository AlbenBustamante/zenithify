import { UserQuota } from '../entities';
import { FREEMIUM_LIMITS, QuotaStatusVO } from '../value-objects';

export class QuotaEnforcementService {
  checkQuota(quota: UserQuota, resource: 'expense' | 'income' | 'task' | 'bookmark', isPremium: boolean): QuotaStatusVO {
    const now = new Date();
    const resetDate = this.getResetDate(quota, resource);

    if (resetDate < now) {
      return new QuotaStatusVO(resource, 0, FREEMIUM_LIMITS[resource], isPremium, now);
    }

    const currentCount = this.getCurrentCount(quota, resource);
    return new QuotaStatusVO(resource, currentCount, FREEMIUM_LIMITS[resource], isPremium, resetDate);
  }

  private getResetDate(quota: UserQuota, resource: 'expense' | 'income' | 'task' | 'bookmark'): Date {
    switch (resource) {
      case 'expense':
        return new Date(quota.expensesResetAt);
      case 'income':
        return new Date(quota.incomesResetAt);
      case 'task':
        return new Date(quota.tasksResetAt);
      case 'bookmark':
        return new Date(quota.bookmarksResetAt);
    }
  }

  private getCurrentCount(quota: UserQuota, resource: 'expense' | 'income' | 'task' | 'bookmark'): number {
    switch (resource) {
      case 'expense':
        return quota.expensesCount;
      case 'income':
        return quota.incomesCount;
      case 'task':
        return quota.tasksCount;
      case 'bookmark':
        return quota.bookmarksCount;
    }
  }

  canCreate(quota: UserQuota, resource: 'expense' | 'income' | 'task' | 'bookmark', isPremium: boolean): boolean {
    const status = this.checkQuota(quota, resource, isPremium);
    return !status.isExceeded;
  }
}