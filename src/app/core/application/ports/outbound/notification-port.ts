import { Notification, NotificationType } from '../../../domain/entities';

export interface NotificationPort {
  create(notification: {
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
  }): Promise<Notification>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  findByUserId(userId: string): Promise<Notification[]>;
  findUnread(userId: string): Promise<Notification[]>;
  delete(id: string): Promise<void>;
}