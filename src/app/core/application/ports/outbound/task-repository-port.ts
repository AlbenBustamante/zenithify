import { Task } from '../../../domain/entities';
import { CreateTaskDto, UpdateTaskDto, TaskFilters } from '../inbound/task-port';

export interface TaskRepositoryPort {
  create(task: CreateTaskDto): Promise<Task>;
  update(id: string, task: UpdateTaskDto): Promise<Task>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Task | null>;
  findAll(filters?: TaskFilters): Promise<Task[]>;
  findPending(): Promise<Task[]>;
  findOverdue(): Promise<Task[]>;
  findDueSoon(days: number): Promise<Task[]>;
}