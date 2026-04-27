import { UserQuota } from '../../domain/entities';

export interface QuotaRepositoryPort {
  findByUserId(userId: string): Promise<UserQuota | null>;
  incrementQuota(userId: string, resource: 'expense' | 'income' | 'task' | 'bookmark'): Promise<void>;
  decrementQuota(userId: string, resource: 'expense' | 'income' | 'task' | 'bookmark'): Promise<void>;
  resetQuota(userId: string, resource: 'expense' | 'income' | 'task' | 'bookmark'): Promise<void>;
}