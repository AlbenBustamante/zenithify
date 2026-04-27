import { inject, Injectable } from '@angular/core';
import { BudgetPort, CreateBudgetDto, UpdateBudgetDto } from '../../ports/inbound/budget-port';
import { BudgetRepositoryPort } from '../../ports/outbound/budget-repository-port';
import { ExpenseRepositoryPort } from '../../ports/outbound/expense-repository-port';
import { ExchangeRateRepositoryPort } from '../../ports/outbound/exchange-rate-repository-port';
import { Budget } from '../../../domain/entities';
import { BudgetCalculationService, BudgetUtilization } from '../../../domain/services';

@Injectable()
export class CreateBudgetUseCase {
  private budgetPort = inject(BudgetPort);

  async execute(dto: CreateBudgetDto): Promise<Budget> {
    return this.budgetPort.create(dto);
  }
}

@Injectable()
export class UpdateBudgetUseCase {
  private budgetPort = inject(BudgetPort);

  async execute(id: string, dto: UpdateBudgetDto): Promise<Budget> {
    return this.budgetPort.update(id, dto);
  }
}

@Injectable()
export class DeleteBudgetUseCase {
  private budgetPort = inject(BudgetPort);

  async execute(id: string): Promise<void> {
    return this.budgetPort.delete(id);
  }
}

@Injectable()
export class ListBudgetsUseCase {
  private budgetPort = inject(BudgetPort);

  async execute(): Promise<Budget[]> {
    return this.budgetPort.findAll();
  }
}

@Injectable()
export class GetBudgetSummaryUseCase {
  private budgetPort = inject(BudgetPort);
  private expenseRepo = inject(ExpenseRepositoryPort);
  private exchangeRateRepo = inject(ExchangeRateRepositoryPort);
  private budgetCalcService = inject(BudgetCalculationService);

  async execute(userId: string): Promise<BudgetUtilization[]> {
    const budgets = await this.budgetPort.findActive();
    const exchangeRate = await this.getExchangeRate(userId);

    const utilizations: BudgetUtilization[] = [];
    for (const budget of budgets) {
      const expenses = await this.expenseRepo.findByDateRange(
        userId,
        new Date(budget.startDate),
        budget.endDate ?? new Date()
      );

      utilizations.push(
        this.budgetCalcService.calculateUtilization(budget, expenses, exchangeRate)
      );
    }

    return utilizations;
  }

  private async getExchangeRate(userId: string): Promise<number> {
    const rate = await this.exchangeRateRepo.findByUserAndPair(userId, 'VES', 'USD');
    return rate?.rate ?? 1;
  }
}