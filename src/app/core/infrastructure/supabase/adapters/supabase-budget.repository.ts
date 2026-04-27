import { Injectable, inject } from '@angular/core';
import { BudgetRepositoryPort } from '../../../application/ports/outbound/budget-repository-port';
import { Budget } from '../../../domain/entities';
import { SupabaseClientService } from '../supabase-client.service';
import { EntityMapper, BudgetRow } from '../mappers/entity-mapper';
import { CreateBudgetDto, UpdateBudgetDto } from '../../../application/ports/inbound/budget-port';

@Injectable({ providedIn: 'root' })
export class SupabaseBudgetRepository implements BudgetRepositoryPort {
  private supabase = inject(SupabaseClientService).getClient();
  private table = 'budgets';

  async create(dto: CreateBudgetDto): Promise<Budget> {
    const user = await this.getCurrentUser();
    const { data, error } = await this.supabase
      .from(this.table)
      .insert({
        user_id: user.id,
        name: dto.name,
        amount: dto.amount,
        currency: dto.currency,
        period: dto.period,
        start_date: dto.startDate.toISOString().split('T')[0],
        end_date: dto.endDate?.toISOString().split('T')[0] ?? null,
        category_ids: dto.categoryIds ?? [],
      })
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toBudget(data as BudgetRow);
  }

  async update(id: string, dto: UpdateBudgetDto): Promise<Budget> {
    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates['name'] = dto.name;
    if (dto.amount !== undefined) updates['amount'] = dto.amount;
    if (dto.currency !== undefined) updates['currency'] = dto.currency;
    if (dto.period !== undefined) updates['period'] = dto.period;
    if (dto.startDate !== undefined) updates['start_date'] = dto.startDate.toISOString().split('T')[0];
    if (dto.endDate !== undefined) updates['end_date'] = dto.endDate?.toISOString().split('T')[0] ?? null;
    if (dto.categoryIds !== undefined) updates['category_ids'] = dto.categoryIds;
    if (dto.isActive !== undefined) updates['is_active'] = dto.isActive;

    const { data, error } = await this.supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toBudget(data as BudgetRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }

  async findById(id: string): Promise<Budget | null> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return EntityMapper.toBudget(data as BudgetRow);
  }

  async findAll(): Promise<Budget[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as BudgetRow[]).map(EntityMapper.toBudget);
  }

  async findActive(): Promise<Budget[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as BudgetRow[]).map(EntityMapper.toBudget);
  }

  private async getCurrentUser() {
    const { data } = await this.supabase.auth.getUser();
    if (!data.user) throw new Error('Not authenticated');
    return data.user;
  }
}