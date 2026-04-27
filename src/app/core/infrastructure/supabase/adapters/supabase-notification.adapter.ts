import { Injectable, inject } from '@angular/core';
import { NotificationPort } from '../../../application/ports/outbound/notification-port';
import { Notification, NotificationType } from '../../../domain/entities';
import { SupabaseClientService } from '../supabase-client.service';
import { EntityMapper, NotificationRow } from '../mappers/entity-mapper';

@Injectable({ providedIn: 'root' })
export class SupabaseNotificationAdapter implements NotificationPort {
  private supabase = inject(SupabaseClientService).getClient();
  private table = 'notifications';

  async create(dto: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  }): Promise<Notification> {
    const { data, error } = await this.supabase
      .from(this.table)
      .insert({
        user_id: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body ?? null,
        data: dto.data ?? {},
      })
      .select()
      .single();

    if (error) throw error;
    return EntityMapper.toNotification(data as NotificationRow);
  }

  async markAsRead(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.table)
      .update({ is_read: true })
      .eq('id', id);

    if (error) throw error;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.table)
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as NotificationRow[]).map(EntityMapper.toNotification);
  }

  async findUnread(userId: string): Promise<Notification[]> {
    const { data, error } = await this.supabase
      .from(this.table)
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as NotificationRow[]).map(EntityMapper.toNotification);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.table).delete().eq('id', id);
    if (error) throw error;
  }
}