import { Budget, BudgetPeriod, Currency } from '../../domain/entities';

export interface CreateBudgetDto {
  name: string;
  amount: number;
  currency: Currency;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;
  categoryIds?: string[];
}

export interface UpdateBudgetDto {
  name?: string;
  amount?: number;
  currency?: Currency;
  period?: BudgetPeriod;
  startDate?: Date;
  endDate?: Date;
  categoryIds?: string[];
  isActive?: boolean;
}

export interface BudgetPort {
  create(budget: CreateBudgetDto): Promise<Budget>;
  update(id: string, budget: UpdateBudgetDto): Promise<Budget>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Budget | null>;
  findAll(): Promise<Budget[]>;
  findActive(): Promise<Budget[]>;
}