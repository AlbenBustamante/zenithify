import { Income, IncomeMethod } from '../../../domain/entities';

export interface CreateIncomeDto {
  amountUsd?: number;
  amountVes?: number;
  exchangeRate: number;
  description: string;
  categoryId?: string;
  incomeDate: Date;
  incomeMethod: IncomeMethod;
}

export interface UpdateIncomeDto {
  amountUsd?: number;
  amountVes?: number;
  exchangeRate?: number;
  description?: string;
  categoryId?: string;
  incomeDate?: Date;
  incomeMethod?: IncomeMethod;
}

export interface IncomeFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
}

export interface IncomePort {
  create(income: CreateIncomeDto): Promise<Income>;
  update(id: string, income: UpdateIncomeDto): Promise<Income>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Income | null>;
  findAll(filters?: IncomeFilters): Promise<Income[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Income[]>;
}