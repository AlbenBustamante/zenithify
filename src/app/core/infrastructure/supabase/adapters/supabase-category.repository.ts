import { Injectable, inject } from '@angular/core';
import { CategoryRepositoryPort } from '../../../application/ports/outbound/category-repository-port';
import { Category, CategoryType } from '../../../domain/entities';
import { SupabaseClientService } from '../supabase-client.service';
import { EntityMapper, CategoryRow } from '../mappers/entity-mapper';
import { CreateCategoryDto, UpdateCategoryDto } from '../../../application/ports/inbound/category-port';

@Injectable({ providedIn: 'root' })
export class SupabaseCategoryRepository implements CategoryRepositoryPort {
  private supabase = inject(SupabaseClientService).getClient();
  private table = 'categories';

  async create(dto: CreateCategoryDto): Promise<Category> {
    const user = await this.getCurrentUser();
    const { data, error } = await this.supabase
      .from(this.table)
      .insert({
        user_id: user.id,
        name: dto.name,
        type: dto.type,
        icon: dto.icon ?? null,
        color: dto.color ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toCategory(data as CategoryRow);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const updates: Record<string, unknown> = {};
    if (dto.name !== undefined) updates['name'] = dto.name;
    if (dto.icon !== undefined) updates['icon'] = dto.icon;
    if (dto.color !== undefined) updates['color'] = dto.color;

    const { data, error } = await this.supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toCategory(data as CategoryRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }

  async findById(id: string): Promise<Category | null> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return EntityMapper.toCategory(data as CategoryRow);
  }

  async findAll(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as CategoryRow[]).map(EntityMapper.toCategory);
  }

  async findByType(type: CategoryType): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('type', type)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as CategoryRow[]).map(EntityMapper.toCategory);
  }

  async findSystem(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('is_system', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as CategoryRow[]).map(EntityMapper.toCategory);
  }

  async findUserCreated(): Promise<Category[]> {
    const user = await this.getCurrentUser();
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('user_id', user.id)
      .eq('is_system', false)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data as CategoryRow[]).map(EntityMapper.toCategory);
  }

  private async getCurrentUser() {
    const { data } = await this.supabase.auth.getUser();
    if (!data.user) throw new Error('Not authenticated');
    return data.user;
  }
}