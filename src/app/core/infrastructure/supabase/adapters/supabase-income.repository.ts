import { Injectable, inject } from '@angular/core';
import { IncomeRepositoryPort } from '../../../application/ports/outbound/income-repository-port';
import { Income } from '../../../domain/entities';
import { SupabaseClientService } from '../supabase-client.service';
import { EntityMapper, IncomeRow } from '../mappers/entity-mapper';
import { CreateIncomeDto, UpdateIncomeDto, IncomeFilters } from '../../../application/ports/inbound/income-port';

@Injectable({ providedIn: 'root' })
export class SupabaseIncomeRepository implements IncomeRepositoryPort {
  private supabase = inject(SupabaseClientService).getClient();
  private table = 'incomes';

  async create(dto: CreateIncomeDto): Promise<Income> {
    const user = await this.getCurrentUser();
    const { data, error } = await this.supabase
      .from(this.table)
      .insert({
        user_id: user.id,
        amount: dto.amount,
        currency: dto.currency,
        description: dto.description,
        category_id: dto.categoryId ?? null,
        income_date: dto.incomeDate.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toIncome(data as IncomeRow);
  }

  async update(id: string, dto: UpdateIncomeDto): Promise<Income> {
    const updates: Record<string, unknown> = {};
    if (dto.amount !== undefined) updates['amount'] = dto.amount;
    if (dto.currency !== undefined) updates['currency'] = dto.currency;
    if (dto.description !== undefined) updates['description'] = dto.description;
    if (dto.categoryId !== undefined) updates['category_id'] = dto.categoryId;
    if (dto.incomeDate !== undefined) updates['income_date'] = dto.incomeDate.toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toIncome(data as IncomeRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }

  async findById(id: string): Promise<Income | null> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return EntityMapper.toIncome(data as IncomeRow);
  }

  async findAll(filters?: IncomeFilters): Promise<Income[]> {
    let query = this.supabase.from(this.table).select('*');

    if (filters?.startDate) {
      query = query.gte('income_date', filters.startDate.toISOString().split('T')[0]);
    }
    if (filters?.endDate) {
      query = query.lte('income_date', filters.endDate.toISOString().split('T')[0]);
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters?.currency) {
      query = query.eq('currency', filters.currency);
    }

    const { data, error } = await query.order('income_date', { ascending: false });

    if (error) throw error;
    return (data as IncomeRow[]).map(EntityMapper.toIncome);
  }

  async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Income[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('user_id', userId)
      .gte('income_date', startDate.toISOString().split('T')[0])
      .lte('income_date', endDate.toISOString().split('T')[0])
      .order('income_date', { ascending: false });

    if (error) throw error;
    return (data as IncomeRow[]).map(EntityMapper.toIncome);
  }

  async findByUserAndMonth(userId: string, year: number, month: number): Promise<Income[]> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('user_id', userId)
      .gte('income_date', startDate.toISOString().split('T')[0])
      .lte('income_date', endDate.toISOString().split('T')[0])
      .order('income_date', { ascending: false });

    if (error) throw error;
    return (data as IncomeRow[]).map(EntityMapper.toIncome);
  }

  private async getCurrentUser() {
    const { data } = await this.supabase.auth.getUser();
    if (!data.user) throw new Error('Not authenticated');
    return data.user;
  }
}