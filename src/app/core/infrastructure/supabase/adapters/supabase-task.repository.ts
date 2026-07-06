import { Injectable, inject } from '@angular/core';
import { TaskRepositoryPort } from '../../../application/ports/outbound/task-repository-port';
import { Task } from '../../../domain/entities';
import { SupabaseClientService } from '../supabase-client.service';
import { EntityMapper, TaskRow } from '../mappers/entity-mapper';
import { CreateTaskDto, UpdateTaskDto, TaskFilters } from '../../../application/ports/inbound/task-port';

@Injectable({ providedIn: 'root' })
export class SupabaseTaskRepository implements TaskRepositoryPort {
  private supabase = inject(SupabaseClientService).getClient();
  private table = 'tasks';

  async create(dto: CreateTaskDto): Promise<Task> {
    const user = await this.getCurrentUser();
    const { data, error } = await this.supabase
      .from(this.table)
      .insert({
        user_id: user.id,
        title: dto.title,
        description: dto.description ?? null,
        due_date: dto.dueDate?.toISOString() ?? null,
        priority: dto.priority ?? 'medium',
        category_id: dto.categoryId ?? null,
        parent_task_id: dto.parentTaskId ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toTask(data as TaskRow);
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    const updates: Record<string, unknown> = {};
    if (dto.title !== undefined) updates['title'] = dto.title;
    if (dto.description !== undefined) updates['description'] = dto.description;
    if (dto.dueDate !== undefined) updates['due_date'] = dto.dueDate?.toISOString() ?? null;
    if (dto.priority !== undefined) updates['priority'] = dto.priority;
    if (dto.status !== undefined) updates['status'] = dto.status;
    if (dto.categoryId !== undefined) updates['category_id'] = dto.categoryId;
    if (dto.parentTaskId !== undefined) updates['parent_task_id'] = dto.parentTaskId;

    const { data, error } = await this.supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toTask(data as TaskRow);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }

  async findById(id: string): Promise<Task | null> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return EntityMapper.toTask(data as TaskRow);
  }

  async findAll(filters?: TaskFilters): Promise<Task[]> {
    let query = this.supabase.from(this.table).select('*');

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters?.parentTaskId !== undefined) {
      if (filters.parentTaskId === null) {
        query = query.is('parent_task_id', null);
      } else {
        query = query.eq('parent_task_id', filters.parentTaskId);
      }
    }
    if (filters?.dueBefore) {
      query = query.lte('due_date', filters.dueBefore.toISOString());
    }
    if (filters?.dueAfter) {
      query = query.gte('due_date', filters.dueAfter.toISOString());
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) throw error;
    return (data as TaskRow[]).map(EntityMapper.toTask);
  }

  async findByParent(parentTaskId: string | null): Promise<Task[]> {
    let query = this.supabase.from(this.table).select('*');
    if (parentTaskId === null) {
      query = query.is('parent_task_id', null);
    } else {
      query = query.eq('parent_task_id', parentTaskId);
    }
    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;
    return (data as TaskRow[]).map(EntityMapper.toTask);
  }

  async findPending(): Promise<Task[]> {
    return this.findAll({ status: 'pending' });
  }

  async findOverdue(): Promise<Task[]> {
    const now = new Date();
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('status', 'pending')
      .lt('due_date', now.toISOString())
      .order('due_date', { ascending: true });

    if (error) throw error;
    return (data as TaskRow[]).map(EntityMapper.toTask);
  }

  async findDueSoon(days: number): Promise<Task[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('status', 'pending')
      .gte('due_date', now.toISOString())
      .lte('due_date', futureDate.toISOString())
      .order('due_date', { ascending: true });

    if (error) throw error;
    return (data as TaskRow[]).map(EntityMapper.toTask);
  }

  private async getCurrentUser() {
    const { data } = await this.supabase.auth.getUser();
    if (!data.user) throw new Error('Not authenticated');
    return data.user;
  }
}
