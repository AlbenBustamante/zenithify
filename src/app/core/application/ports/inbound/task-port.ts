import { Task, TaskPriority, TaskStatus } from '../../../domain/entities';

export interface CreateTaskDto {
  title: string;
  description?: string;
  dueDate?: Date;
  priority?: TaskPriority;
  categoryId?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  dueDate?: Date;
  priority?: TaskPriority;
  status?: TaskStatus;
  categoryId?: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  categoryId?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

export interface TaskPort {
  create(task: CreateTaskDto): Promise<Task>;
  update(id: string, task: UpdateTaskDto): Promise<Task>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Task | null>;
  findAll(filters?: TaskFilters): Promise<Task[]>;
  findPending(): Promise<Task[]>;
  findOverdue(): Promise<Task[]>;
  findDueSoon(days: number): Promise<Task[]>;
}