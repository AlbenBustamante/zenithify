import { Income } from '../../../domain/entities';
import { CreateIncomeDto, UpdateIncomeDto, IncomeFilters } from '../inbound/income-port';

export interface IncomeRepositoryPort {
  create(income: CreateIncomeDto): Promise<Income>;
  update(id: string, income: UpdateIncomeDto): Promise<Income>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Income | null>;
  findAll(filters?: IncomeFilters): Promise<Income[]>;
  findByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Income[]>;
  findByUserAndMonth(userId: string, year: number, month: number): Promise<Income[]>;
}