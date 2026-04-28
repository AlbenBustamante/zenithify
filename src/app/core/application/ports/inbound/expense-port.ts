import { Expense, Currency } from '../../../domain/entities';

export interface CreateExpenseDto {
  amount: number;
  currency: Currency;
  description: string;
  categoryId?: string;
  expenseDate: Date;
  receiptUrl?: string;
}

export interface UpdateExpenseDto {
  amount?: number;
  currency?: Currency;
  description?: string;
  categoryId?: string;
  expenseDate?: Date;
  receiptUrl?: string;
}

export interface ExpenseFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  currency?: Currency;
}

export interface ExpensePort {
  create(expense: CreateExpenseDto): Promise<Expense>;
  update(id: string, expense: UpdateExpenseDto): Promise<Expense>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Expense | null>;
  findAll(filters?: ExpenseFilters): Promise<Expense[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Expense[]>;
}