import { Injectable, inject } from '@angular/core';
import { PlanRepositoryPort } from '../../../application/ports/outbound/plan-repository-port';
import { Plan } from '../../../domain/entities';
import { SupabaseClientService } from '../supabase-client.service';
import { EntityMapper, PlanRow } from '../mappers/entity-mapper';
import { CreatePlanDto, UpdatePlanDto } from '../../../application/ports/inbound/plan-port';

@Injectable({ providedIn: 'root' })
export class SupabasePlanRepository implements PlanRepositoryPort {
  private supabase = inject(SupabaseClientService).getClient();
  private table = 'plans';

  async create(dto: CreatePlanDto): Promise<Plan> {
    const user = await this.getCurrentUser();
    const { data, error } = await this.supabase
      .from(this.table)
      .insert({
        user_id: user.id,
        name: dto.name,
        provider: dto.provider,
        amount: dto.amount,
        currency: dto.currency,
        billing_cycle: dto.billingCycle,
        next_billing_date: dto.nextBillingDate.toISOString().split('T')[0],
        category_id: dto.categoryId ?? null,
        url: dto.url ?? null,
        notes: dto.notes ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toPlan(data as PlanRow);
  }

  async update(id: string, dto: UpdatePlanDto): Promise<Plan> {
    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates['name'] = dto.name;
    if (dto.provider !== undefined) updates['provider'] = dto.provider;
    if (dto.amount !== undefined) updates['amount'] = dto.amount;
    if (dto.currency !== undefined) updates['currency'] = dto.currency;
    if (dto.billingCycle !== undefined) updates['billing_cycle'] = dto.billingCycle;
    if (dto.nextBillingDate !== undefined) updates['next_billing_date'] = dto.nextBillingDate.toISOString().split('T')[0];
    if (dto.categoryId !== undefined) updates['category_id'] = dto.categoryId;
    if (dto.url !== undefined) updates['url'] = dto.url;
    if (dto.notes !== undefined) updates['notes'] = dto.notes;
    if (dto.isActive !== undefined) updates['is_active'] = dto.isActive;

    const { data, error } = await this.supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toPlan(data as PlanRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }

  async findById(id: string): Promise<Plan | null> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return EntityMapper.toPlan(data as PlanRow);
  }

  async findAll(): Promise<Plan[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .order('next_billing_date', { ascending: true });

    if (error) throw error;
    return (data as PlanRow[]).map(EntityMapper.toPlan);
  }

  async findActive(): Promise<Plan[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('is_active', true)
      .order('next_billing_date', { ascending: true });

    if (error) throw error;
    return (data as PlanRow[]).map(EntityMapper.toPlan);
  }

  async findUpcomingRenewals(daysAhead: number): Promise<Plan[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('is_active', true)
      .lte('next_billing_date', futureDate.toISOString().split('T')[0])
      .order('next_billing_date', { ascending: true });

    if (error) throw error;
    return (data as PlanRow[]).map(EntityMapper.toPlan);
  }

  private async getCurrentUser() {
    const { data } = await this.supabase.auth.getUser();
    if (!data.user) throw new Error('Not authenticated');
    return data.user;
  }
}