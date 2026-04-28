import { Income, Currency } from '../../../domain/entities';

export interface CreateIncomeDto {
  amount: number;
  currency: Currency;
  description: string;
  categoryId?: string;
  incomeDate: Date;
}

export interface UpdateIncomeDto {
  amount?: number;
  currency?: Currency;
  description?: string;
  categoryId?: string;
  incomeDate?: Date;
}

export interface IncomeFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  currency?: Currency;
}

export interface IncomePort {
  create(income: CreateIncomeDto): Promise<Income>;
  update(id: string, income: UpdateIncomeDto): Promise<Income>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Income | null>;
  findAll(filters?: IncomeFilters): Promise<Income[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Income[]>;
}