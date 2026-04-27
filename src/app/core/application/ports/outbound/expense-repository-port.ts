import { Expense, Currency } from '../../domain/entities';
import { CreateExpenseDto, UpdateExpenseDto, ExpenseFilters } from '../inbound/expense-port';

export interface ExpenseRepositoryPort {
  create(expense: CreateExpenseDto): Promise<Expense>;
  update(id: string, expense: UpdateExpenseDto): Promise<Expense>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Expense | null>;
  findAll(filters?: ExpenseFilters): Promise<Expense[]>;
  findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Expense[]>;
  findByUserAndMonth(userId: string, year: number, month: number): Promise<Expense[]>;
}