import { Budget } from '../../domain/entities';
import { CreateBudgetDto, UpdateBudgetDto } from '../inbound/budget-port';

export interface BudgetRepositoryPort {
  create(budget: CreateBudgetDto): Promise<Budget>;
  update(id: string, budget: UpdateBudgetDto): Promise<Budget>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Budget | null>;
  findAll(): Promise<Budget[]>;
  findActive(): Promise<Budget[]>;
}