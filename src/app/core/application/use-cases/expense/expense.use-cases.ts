import { inject, Injectable } from '@angular/core';
import { ExpensePort, CreateExpenseDto, UpdateExpenseDto, ExpenseFilters } from '../../ports/inbound/expense-port';
import { QuotaRepositoryPort } from '../../ports/outbound/quota-repository-port';
import { Expense } from '../../../domain/entities';
import { QuotaEnforcementService } from '../../../domain/services';

@Injectable()
export class CreateExpenseUseCase {
  private expensePort = inject(ExpensePort);
  private quotaRepo = inject(QuotaRepositoryPort);
  private quotaService = inject(QuotaEnforcementService);

  async execute(dto: CreateExpenseDto, userId: string, isPremium: boolean): Promise<Expense> {
    const quota = await this.quotaRepo.findByUserId(userId);
    if (!quota) throw new Error('Quota not found');

    const quotaStatus = this.quotaService.checkQuota(quota, 'expense', isPremium);
    if (quotaStatus.isExceeded) {
      throw new Error(`Freemium limit reached. Upgrade to premium to add more expenses.`);
    }

    const expense = await this.expensePort.create(dto);
    await this.quotaRepo.incrementQuota(userId, 'expense');
    return expense;
  }
}

@Injectable()
export class UpdateExpenseUseCase {
  private expensePort = inject(ExpensePort);

  async execute(id: string, dto: UpdateExpenseDto): Promise<Expense> {
    return this.expensePort.update(id, dto);
  }
}

@Injectable()
export class DeleteExpenseUseCase {
  private expensePort = inject(ExpensePort);
  private quotaRepo = inject(QuotaRepositoryPort);

  async execute(id: string, userId: string): Promise<void> {
    const expense = await this.expensePort.findById(id);
    if (!expense) throw new Error('Expense not found');

    await this.expensePort.delete(id);
    await this.quotaRepo.decrementQuota(userId, 'expense');
  }
}

@Injectable()
export class ListExpensesUseCase {
  private expensePort = inject(ExpensePort);

  async execute(filters?: ExpenseFilters): Promise<Expense[]> {
    return this.expensePort.findAll(filters);
  }
}