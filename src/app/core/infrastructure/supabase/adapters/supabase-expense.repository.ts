import { Injectable, inject } from '@angular/core';
import { ExpenseRepositoryPort } from '../../../application/ports/outbound/expense-repository-port';
import { Expense, Currency } from '../../../domain/entities';
import { SupabaseClientService } from '../supabase-client.service';
import { EntityMapper, ExpenseRow } from '../mappers/entity-mapper';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseFilters } from '../../../application/ports/inbound/expense-port';
import { toISOStringDate } from '../../../../shared/utils/date.util';

@Injectable({ providedIn: 'root' })
export class SupabaseExpenseRepository implements ExpenseRepositoryPort {
  private supabase = inject(SupabaseClientService).getClient();
  private table = 'expenses';

  async create(dto: CreateExpenseDto): Promise<Expense> {
    const user = await this.getCurrentUser();
    const { data, error } = await this.supabase
      .from(this.table)
      .insert({
        user_id: user.id,
        amount_usd: dto.amountUsd ?? null,
        amount_ves: dto.amountVes ?? null,
        exchange_rate: dto.exchangeRate,
        description: dto.description,
        category_id: dto.categoryId ?? null,
        expense_date: toISOStringDate(dto.expenseDate),
        payment_method: dto.paymentMethod,
        receipt_url: dto.receiptUrl ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toExpense(data as ExpenseRow);
  }

  async update(id: string, dto: UpdateExpenseDto): Promise<Expense> {
    const updates: Record<string, unknown> = {};
    if (dto.amountUsd !== undefined) updates['amount_usd'] = dto.amountUsd ?? null;
    if (dto.amountVes !== undefined) updates['amount_ves'] = dto.amountVes ?? null;
    if (dto.exchangeRate !== undefined) updates['exchange_rate'] = dto.exchangeRate;
    if (dto.description !== undefined) updates['description'] = dto.description;
    if (dto.categoryId !== undefined) updates['category_id'] = dto.categoryId;
    if (dto.expenseDate !== undefined) updates['expense_date'] = toISOStringDate(dto.expenseDate);
    if (dto.paymentMethod !== undefined) updates['payment_method'] = dto.paymentMethod;
    if (dto.receiptUrl !== undefined) updates['receipt_url'] = dto.receiptUrl;

    const { data, error } = await this.supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toExpense(data as ExpenseRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }

  async findById(id: string): Promise<Expense | null> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return EntityMapper.toExpense(data as ExpenseRow);
  }

  async findAll(filters?: ExpenseFilters): Promise<Expense[]> {
    let query = this.supabase.from(this.table).select('*');

    if (filters?.startDate) {
      query = query.gte('expense_date', toISOStringDate(filters.startDate));
    }
    if (filters?.endDate) {
      query = query.lte('expense_date', toISOStringDate(filters.endDate));
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }

    const { data, error } = await query.order('expense_date', { ascending: false });

    if (error) throw error;
    return (data as ExpenseRow[]).map(EntityMapper.toExpense);
  }

  async findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Expense[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('user_id', userId)
      .gte('expense_date', toISOStringDate(startDate))
      .lte('expense_date', toISOStringDate(endDate))
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return (data as ExpenseRow[]).map(EntityMapper.toExpense);
  }

  async findByUserAndMonth(userId: string, year: number, month: number): Promise<Expense[]> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);

    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('user_id', userId)
      .gte('expense_date', toISOStringDate(startDate))
      .lte('expense_date', toISOStringDate(endDate))
      .order('expense_date', { ascending: false });

    if (error) throw error;
    return (data as ExpenseRow[]).map(EntityMapper.toExpense);
  }

  private async getCurrentUser() {
    const { data } = await this.supabase.auth.getUser();
    if (!data.user) throw new Error('Not authenticated');
    return data.user;
  }
}