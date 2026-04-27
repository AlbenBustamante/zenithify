import { Injectable, inject } from '@angular/core';
import { QuotaRepositoryPort } from '../../../application/ports/outbound/quota-repository-port';
import { UserQuota } from '../../../domain/entities';
import { SupabaseClientService } from '../supabase-client.service';
import { EntityMapper, UserQuotaRow } from '../mappers/entity-mapper';

@Injectable({ providedIn: 'root' })
export class SupabaseQuotaRepository implements QuotaRepositoryPort {
  private supabase = inject(SupabaseClientService).getClient();
  private table = 'user_quotas';

  async findByUserId(userId: string): Promise<UserQuota | null> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) return null;
    return EntityMapper.toUserQuota(data as UserQuotaRow);
  }

  async incrementQuota(userId: string, resource: 'expense' | 'income' | 'task' | 'bookmark'): Promise<void> {
    const columnMap: Record<string, string> = {
      expense: 'expenses_count',
      income: 'incomes_count',
      task: 'tasks_count',
      bookmark: 'bookmarks_count',
    };

    const { error } = await this.supabase.rpc('increment_quota', {
      p_user_id: userId,
      p_resource: resource,
    });

    if (error) {
      const { error: updateError } = await this.supabase
        .from(this.table)
        .update({ [columnMap[resource]]: this.supabase.rpc('coalesce', { col: columnMap[resource], default: 0 }) })
        .eq('user_id', userId);
      if (updateError) throw updateError;
    }
  }

  async decrementQuota(userId: string, resource: 'expense' | 'income' | 'task' | 'bookmark'): Promise<void> {
    const { error } = await this.supabase.rpc('decrement_quota', {
      p_user_id: userId,
      p_resource: resource,
    });

    if (error) throw error;
  }

  async resetQuota(userId: string, resource: 'expense' | 'income' | 'task' | 'bookmark'): Promise<void> {
    const resetColumnMap: Record<string, string> = {
      expense: 'expenses_reset_at',
      income: 'incomes_reset_at',
      task: 'tasks_reset_at',
      bookmark: 'bookmarks_reset_at',
    };

    const countColumnMap: Record<string, string> = {
      expense: 'expenses_count',
      income: 'incomes_count',
      task: 'tasks_count',
      bookmark: 'bookmarks_count',
    };

    const { error } = await this.supabase
      .from(this.table)
      .update({
        [resetColumnMap[resource]]: new Date().toISOString().split('T')[0],
        [countColumnMap[resource]]: 0,
      })
      .eq('user_id', userId);

    if (error) throw error;
  }
}