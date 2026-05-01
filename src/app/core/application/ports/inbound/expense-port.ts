import { Expense, PaymentMethod } from '../../../domain/entities';

export interface CreateExpenseDto {
  amountUsd?: number;
  amountVes?: number;
  exchangeRate: number;
  description: string;
  categoryId?: string;
  expenseDate: Date;
  paymentMethod: PaymentMethod;
  receiptUrl?: string;
}

export interface UpdateExpenseDto {
  amountUsd?: number;
  amountVes?: number;
  exchangeRate?: number;
  description?: string;
  categoryId?: string;
  expenseDate?: Date;
  paymentMethod?: PaymentMethod;
  receiptUrl?: string;
}

export interface ExpenseFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
}

export interface ExpensePort {
  create(expense: CreateExpenseDto): Promise<Expense>;
  update(id: string, expense: UpdateExpenseDto): Promise<Expense>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Expense | null>;
  findAll(filters?: ExpenseFilters): Promise<Expense[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Expense[]>;
}